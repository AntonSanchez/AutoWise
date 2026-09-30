import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePendingUsers, type ReviewStatus } from '@/components/pending-users-provider';
import { useProfile, type ScheduledService } from '@/components/profile-provider';

const colors = {
  background: '#171a1d', card: '#1d2227', border: 'rgba(255,255,255,0.09)', gold: '#f2bc39',
  muted: '#8d8a86', text: '#f5f4f2', soft: '#d0cbc2', green: '#70d6a0', red: '#ff7a6b', blue: '#82b8ff',
};

type MechanicStatus = 'Available' | 'Busy' | 'Off-duty';
type AdminRole = 'Owner' | 'Admin' | 'Support';
type AdminTab = 'overview' | 'approvals' | 'bookings' | 'mechanics' | 'customers' | 'catalog' | 'security';
type Mechanic = { id: number; name: string; specialty: string; status: MechanicStatus; jobs: number; hours: string; capacity: number };
type CatalogItem = { id: number; name: string; category: string; price: string; interval: string; vehicleScope: string };
type AuditEntry = { id: string; action: string; time: string };

const initialMechanics: Mechanic[] = [
  { id: 1, name: 'Carlos Garcia', specialty: 'Engine Repair', status: 'Available', jobs: 3, hours: '8:00 AM–5:00 PM', capacity: 5 },
  { id: 2, name: 'Jose Martinez', specialty: 'Brake & Suspension', status: 'Busy', jobs: 5, hours: '9:00 AM–6:00 PM', capacity: 5 },
  { id: 3, name: 'Marco Villanueva', specialty: 'Oil Change & Tune-up', status: 'Available', jobs: 2, hours: '8:00 AM–5:00 PM', capacity: 6 },
];

const initialCatalog: CatalogItem[] = [
  { id: 1, name: 'Oil & filter change', category: 'Maintenance', price: '2400', interval: '5,000 km', vehicleScope: 'All vehicles' },
  { id: 2, name: 'Tire rotation', category: 'Maintenance', price: '900', interval: '10,000 km', vehicleScope: 'All vehicles' },
  { id: 3, name: 'Brake inspection', category: 'Inspection', price: '750', interval: '10,000 km', vehicleScope: 'All vehicles' },
];

const tabItems: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'approvals', label: 'Approvals', icon: 'person-add-outline' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { id: 'mechanics', label: 'Mechanics', icon: 'construct-outline' },
  { id: 'customers', label: 'Customers', icon: 'people-outline' },
  { id: 'catalog', label: 'Catalog', icon: 'list-outline' },
  { id: 'security', label: 'Security', icon: 'shield-checkmark-outline' },
];

function nowLabel() {
  return new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AdminScreen() {
  const router = useRouter();
  const pendingUsers = usePendingUsers();
  const { profile, vehicles, scheduledServices, historyItems, updateScheduledService } = useProfile();
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus>('Pending');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<AdminRole>('Owner');
  const [mechanics, setMechanics] = useState(initialMechanics);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [audit, setAudit] = useState<AuditEntry[]>([{ id: 'start', action: 'Admin preview session opened', time: nowLabel() }]);
  const [editingBooking, setEditingBooking] = useState<ScheduledService | null>(null);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [editingCatalog, setEditingCatalog] = useState<CatalogItem | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [supportNote, setSupportNote] = useState('');

  const recordAudit = (action: string) => setAudit((current) => [{ id: `${Date.now()}-${Math.random()}`, action, time: nowLabel() }, ...current]);
  const pendingCount = pendingUsers.users.filter((user) => user.status === 'Pending').length;
  const confirmedBookings = scheduledServices.filter((service) => service.status === 'Confirmed').length;
  const completedBookings = scheduledServices.filter((service) => service.status === 'Completed').length;
  const cancelledBookings = scheduledServices.filter((service) => service.status === 'Cancelled').length;
  const currentMonthRevenue = historyItems.filter((item) => {
    const date = new Date(item.date);
    const today = new Date();
    return item.status === 'Completed' && Number.isFinite(item.cost) && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }).reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const visibleApplicants = pendingUsers.users.filter((user) => user.status === reviewFilter);
  const filteredCustomers = pendingUsers.users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedCustomer = pendingUsers.users.find((user) => user.id === selectedCustomerId);
  const availableMechanics = mechanics.filter((mechanic) => mechanic.status === 'Available' && mechanic.jobs < mechanic.capacity);
  const visibleBookings = scheduledServices.filter((service) => service.status !== 'Cancelled' && service.status !== 'Completed');
  const visibleTabs = role === 'Owner' ? tabItems : role === 'Admin' ? tabItems.filter((tab) => tab.id !== 'security') : tabItems.filter((tab) => tab.id === 'customers');
  const recentBookings = useMemo(() => [...scheduledServices].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)), [scheduledServices]);

  const updateApplicantStatus = (id: number, status: ReviewStatus) => {
    const applicant = pendingUsers.users.find((user) => user.id === id);
    if (!applicant) return;
    if (status === 'Approved') {
      const mechanic = [...availableMechanics].sort((a, b) => a.jobs - b.jobs)[0];
      const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      pendingUsers.updateStatus(id, status, mechanic ? { mechanic: mechanic.name, date } : undefined);
      if (mechanic) setMechanics((current) => current.map((item) => item.id === mechanic.id ? { ...item, jobs: item.jobs + 1, status: item.jobs + 1 >= item.capacity ? 'Busy' : item.status } : item));
      recordAudit(`Approved customer ${applicant.email}${mechanic ? `; assigned ${mechanic.name}` : ''}`);
      router.replace('/auth');
      return;
    }
    pendingUsers.updateStatus(id, status);
    recordAudit(`${status} customer ${applicant.email}`);
  };

  const saveMechanic = () => {
    if (!editingMechanic?.name.trim() || !editingMechanic.specialty.trim()) return;
    const isNew = !mechanics.some((item) => item.id === editingMechanic.id);
    setMechanics((current) => isNew ? [...current, editingMechanic] : current.map((item) => item.id === editingMechanic.id ? editingMechanic : item));
    recordAudit(`${isNew ? 'Added' : 'Updated'} mechanic ${editingMechanic.name}`);
    setEditingMechanic(null);
  };

  const saveCatalogItem = () => {
    if (!editingCatalog?.name.trim()) return;
    const isNew = !catalog.some((item) => item.id === editingCatalog.id);
    setCatalog((current) => isNew ? [...current, editingCatalog] : current.map((item) => item.id === editingCatalog.id ? editingCatalog : item));
    recordAudit(`${isNew ? 'Added' : 'Updated'} service catalog item ${editingCatalog.name}`);
    setEditingCatalog(null);
  };

  const saveBooking = () => {
    if (!editingBooking) return;
    updateScheduledService(editingBooking.id, editingBooking);
    recordAudit(`Updated booking ${editingBooking.title} for ${editingBooking.scheduledDate}${editingBooking.assignedMechanic ? `; assigned ${editingBooking.assignedMechanic}` : ''}`);
    setEditingBooking(null);
  };

  if (!loggedIn) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loginContainer}>
          <View style={styles.brandMark}><Ionicons name="shield-checkmark" size={24} color={colors.gold} /></View>
          <Text style={styles.brand}>AUTOWISE ADMIN</Text>
          <View style={styles.card}>
            <Text style={styles.title}>Admin console preview</Text>
            <Text style={styles.subtitle}>This frontend preview does not authenticate administrators. Connect a trusted identity provider and server-side role checks before using real customer data.</Text>
            <View style={styles.securityNotice}><Ionicons name="warning-outline" size={18} color={colors.gold} /><Text style={styles.securityNoticeText}>Demo access only. Actions and audit entries are local to this session.</Text></View>
            <Pressable accessibilityRole="button" onPress={() => setLoggedIn(true)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Open admin preview</Text><Ionicons name="arrow-forward" size={18} color={colors.background} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/auth')} style={styles.backToLogin}><Text style={styles.hint}>Back to customer sign in</Text></Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.dashboard}>
        <View style={styles.topBar}>
          <View><Text style={styles.eyebrow}>AUTOWISE ADMIN · PREVIEW</Text><Text style={styles.title}>{tabItems.find((tab) => tab.id === activeTab)?.label}</Text></View>
          <View style={styles.topActions}>
            <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{role}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={() => { recordAudit('Admin preview session ended'); setLoggedIn(false); }} style={styles.logoutButton}><Ionicons name="log-out-outline" size={19} color={colors.muted} /></Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabStrip}>
          {visibleTabs.map((tab) => (
            <Pressable key={tab.id} accessibilityRole="button" accessibilityState={{ selected: activeTab === tab.id }} onPress={() => setActiveTab(tab.id)} style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}>
              <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.id ? colors.gold : colors.muted} />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
              {tab.id === 'approvals' && pendingCount > 0 && <View style={styles.smallBadge}><Text style={styles.smallBadgeText}>{pendingCount}</Text></View>}
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === 'overview' && (
          <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.content}>
            <View style={styles.securityNotice}><Ionicons name="information-circle-outline" size={18} color={colors.gold} /><Text style={styles.securityNoticeText}>Preview data only. Booking, revenue, and customer records are shared local app state.</Text></View>
            <View style={styles.metricGrid}>
              <MetricCard icon="person-add-outline" label="Pending approvals" value={pendingCount} tone={colors.gold} onPress={() => setActiveTab('approvals')} />
              <MetricCard icon="calendar-outline" label="Upcoming bookings" value={visibleBookings.length} tone={colors.blue} onPress={() => setActiveTab('bookings')} />
              <MetricCard icon="checkmark-done-outline" label="Completed jobs" value={completedBookings} tone={colors.green} onPress={() => setActiveTab('bookings')} />
              <MetricCard icon="close-circle-outline" label="Cancellations" value={cancelledBookings} tone={colors.red} onPress={() => setActiveTab('bookings')} />
            </View>
            <View style={styles.revenueCard}><Text style={styles.metricLabel}>MONTHLY SERVICE REVENUE</Text><Text style={styles.revenueValue}>₱{currentMonthRevenue.toLocaleString()}</Text><Text style={styles.mutedText}>Calculated from completed service records dated this month.</Text></View>
            <SectionHeading title="Upcoming bookings" action="Manage" onPress={() => setActiveTab('bookings')} />
            {recentBookings.filter((item) => item.status !== 'Cancelled' && item.status !== 'Completed').slice(0, 4).map((booking) => <BookingSummary key={booking.id} booking={booking} />)}
            {visibleBookings.length === 0 && <EmptyState text="No active bookings. Customer bookings will appear here." />}
            <SectionHeading title="Latest activity" action="Audit log" onPress={() => setActiveTab('security')} />
            {audit.slice(0, 4).map((item) => <AuditRow key={item.id} item={item} />)}
          </ScrollView>
        )}

        {activeTab === 'approvals' && (
          <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.content}>
            <View style={styles.summaryCard}><View style={styles.summaryIcon}><Ionicons name="people-outline" size={20} color={colors.gold} /></View><View style={styles.summaryCopy}><Text style={styles.metricLabel}>PENDING</Text><Text style={styles.mutedText}>Customer requests</Text></View><Text style={styles.summaryCount}>{pendingCount}</Text></View>
            <View style={styles.filterRow}>{(['Pending', 'Approved', 'Rejected'] as const).map((status) => <FilterChip key={status} label={status} active={reviewFilter === status} onPress={() => setReviewFilter(status)} />)}</View>
            {visibleApplicants.length ? visibleApplicants.map((applicant) => (
              <View key={applicant.id} style={styles.applicantCard}>
                <Pressable accessibilityRole="button" onPress={() => setSelectedCustomerId(applicant.id)} style={styles.customerPress}>
                  <Avatar name={applicant.name} />
                  <View style={styles.customerInfo}><Text style={styles.applicantName}>{applicant.name}</Text><Text style={styles.applicantEmail}>{applicant.email}</Text></View>
                  <Text style={styles.joined}>{applicant.joined}</Text>
                </Pressable>
                {applicant.status === 'Pending' ? <View style={styles.actions}>
                  <ActionButton label="Reject" icon="close" tone={colors.red} onPress={() => updateApplicantStatus(applicant.id, 'Rejected')} />
                  <ActionButton label="Approve" icon="checkmark" tone={colors.green} onPress={() => updateApplicantStatus(applicant.id, 'Approved')} />
                </View> : <Text style={[styles.statusText, { color: applicant.status === 'Approved' ? colors.green : colors.red }]}>{applicant.status}{applicant.assignedMechanic ? ` · ${applicant.assignedMechanic}` : ''}</Text>}
              </View>
            )) : <EmptyState text={`No ${reviewFilter.toLowerCase()} customers.`} />}
          </ScrollView>
        )}

        {activeTab === 'bookings' && (
          <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.content}>
            <View style={styles.summaryCard}><View style={styles.summaryIcon}><Ionicons name="calendar-outline" size={20} color={colors.gold} /></View><View style={styles.summaryCopy}><Text style={styles.metricLabel}>BOOKING QUEUE</Text><Text style={styles.mutedText}>{visibleBookings.length} active booking{visibleBookings.length === 1 ? '' : 's'}</Text></View><Text style={styles.summaryCount}>{visibleBookings.length}</Text></View>
            {recentBookings.map((booking) => <View key={booking.id} style={styles.dataCard}>
              <View style={styles.cardHeading}><View style={styles.flexCopy}><Text style={styles.cardTitle}>{booking.title}</Text><Text style={styles.cardSubtitle}>{booking.scheduledDate} · {booking.vehicle}</Text></View><StatusPill status={booking.status ?? 'Pending'} /></View>
              <Text style={styles.cardMeta}>{booking.targetMileage}{booking.assignedMechanic ? ` · ${booking.assignedMechanic}` : ''}</Text>
              {booking.status !== 'Cancelled' && booking.status !== 'Completed' && <View style={styles.wrapActions}>
                <SmallAction label="Edit / reschedule" icon="create-outline" onPress={() => setEditingBooking({ ...booking })} />
                {!booking.status || booking.status === 'Pending' ? <SmallAction label="Confirm" icon="checkmark-circle-outline" tone={colors.green} onPress={() => { updateScheduledService(booking.id, { status: 'Confirmed' }); recordAudit(`Confirmed booking ${booking.title}`); }} /> : null}
                <SmallAction label="Cancel" icon="close-circle-outline" tone={colors.red} onPress={() => { updateScheduledService(booking.id, { status: 'Cancelled' }); recordAudit(`Cancelled booking ${booking.title}`); }} />
              </View>}
            </View>)}
            {!scheduledServices.length && <EmptyState text="No bookings yet. New customer requests appear here." />}
          </ScrollView>
        )}

        {activeTab === 'mechanics' && (
          <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.content}>
            <View style={styles.sectionToolbar}><Text style={styles.mutedText}>Specialty · hours · capacity</Text><Pressable accessibilityRole="button" onPress={() => setEditingMechanic({ id: Date.now(), name: '', specialty: '', status: 'Available', jobs: 0, hours: '8:00 AM–5:00 PM', capacity: 5 })} style={styles.addButton}><Ionicons name="add" size={17} color={colors.background} /><Text style={styles.addButtonText}>Add</Text></Pressable></View>
            {mechanics.map((mechanic) => <View key={mechanic.id} style={styles.dataCard}>
              <View style={styles.cardHeading}><Avatar name={mechanic.name} /><View style={styles.customerInfo}><Text style={styles.cardTitle}>{mechanic.name}</Text><Text style={styles.cardSubtitle}>{mechanic.specialty}</Text></View><StatusPill status={mechanic.status} /></View>
              <Text style={styles.cardMeta}>{mechanic.hours} · {mechanic.jobs}/{mechanic.capacity} jobs</Text>
              <View style={styles.wrapActions}><SmallAction label="Edit" icon="create-outline" onPress={() => setEditingMechanic({ ...mechanic })} />{(['Available', 'Busy', 'Off-duty'] as const).map((status) => <SmallAction key={status} label={status} icon={status === 'Available' ? 'checkmark-circle-outline' : status === 'Busy' ? 'time-outline' : 'moon-outline'} tone={status === 'Available' ? colors.green : status === 'Busy' ? colors.gold : colors.muted} onPress={() => { setMechanics((current) => current.map((item) => item.id === mechanic.id ? { ...item, status } : item)); recordAudit(`Changed ${mechanic.name} availability to ${status}`); }} />)}</View>
            </View>)}
          </ScrollView>
        )}

        {activeTab === 'customers' && (
          <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.content}>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search name or email" placeholderTextColor={colors.muted} style={styles.searchInput} />
            {filteredCustomers.map((customer) => <Pressable key={customer.id} accessibilityRole="button" onPress={() => { setSelectedCustomerId(customer.id); setSupportNote(''); }} style={styles.dataCard}>
              <View style={styles.cardHeading}><Avatar name={customer.name} /><View style={styles.customerInfo}><Text style={styles.cardTitle}>{customer.name}</Text><Text style={styles.cardSubtitle}>{customer.email}</Text></View><StatusPill status={customer.status} /></View>
              <Text style={styles.cardMeta}>Joined {customer.joined} · View details</Text>
            </Pressable>)}
            {!filteredCustomers.length && <EmptyState text="No matching customer accounts." />}
          </ScrollView>
        )}

        {activeTab === 'catalog' && (
          <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.content}>
            <View style={styles.sectionToolbar}><Text style={styles.mutedText}>Services · prices · intervals</Text><Pressable accessibilityRole="button" onPress={() => setEditingCatalog({ id: Date.now(), name: '', category: 'Maintenance', price: '', interval: '', vehicleScope: 'All vehicles' })} style={styles.addButton}><Ionicons name="add" size={17} color={colors.background} /><Text style={styles.addButtonText}>Add</Text></Pressable></View>
            {catalog.map((item) => <View key={item.id} style={styles.dataCard}>
              <View style={styles.cardHeading}><View style={styles.summaryIcon}><Ionicons name="construct-outline" size={17} color={colors.gold} /></View><View style={styles.customerInfo}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.cardSubtitle}>{item.category} · ₱{Number(item.price || 0).toLocaleString()}</Text></View><Pressable accessibilityRole="button" onPress={() => setEditingCatalog({ ...item })} style={styles.iconAction}><Ionicons name="create-outline" size={18} color={colors.gold} /></Pressable></View>
              <Text style={styles.cardMeta}>Interval: {item.interval || 'Not set'} · Applies to: {item.vehicleScope || 'All vehicles'}</Text>
            </View>)}
          </ScrollView>
        )}

        {activeTab === 'security' && (
          <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.content}>
            <View style={styles.securityPanel}><View style={styles.securityPanelHeader}><Ionicons name="shield-checkmark-outline" size={20} color={colors.gold} /><Text style={styles.cardTitle}>Security preview</Text></View><Text style={styles.cardMeta}>Demo only. Enforce roles and audit logs on the server.</Text></View>
            <Text style={styles.sectionTitle}>Preview role</Text>
            <View style={styles.filterRow}>{(['Owner', 'Admin', 'Support'] as const).map((item) => <FilterChip key={item} label={item} active={role === item} onPress={() => { setRole(item); if (item === 'Support') setActiveTab('customers'); else if (activeTab === 'security') setActiveTab('overview'); recordAudit(`Preview role changed to ${item}`); }} />)}</View>
            <Text style={styles.sectionTitle}>Suggested access levels</Text>
            <View style={styles.dataCard}><Text style={styles.cardTitle}>Owner</Text><Text style={styles.cardMeta}>Manage administrators, settings, catalog, and all records.</Text></View>
            <View style={styles.dataCard}><Text style={styles.cardTitle}>Admin</Text><Text style={styles.cardMeta}>Manage bookings, mechanics, customer approvals, and services.</Text></View>
            <View style={styles.dataCard}><Text style={styles.cardTitle}>Support</Text><Text style={styles.cardMeta}>Search customer accounts and record support notes.</Text></View>
            <SectionHeading title="Session activity log" action="Clear" onPress={() => { setAudit([]); }} />
            {audit.length ? audit.map((item) => <AuditRow key={item.id} item={item} />) : <EmptyState text="No activity has been recorded in this session." />}
          </ScrollView>
        )}

        <Modal transparent visible={editingBooking !== null} animationType="fade" onRequestClose={() => setEditingBooking(null)}>
          <ModalShell title="Edit booking" onClose={() => setEditingBooking(null)}>
            <Field label="Service" value={editingBooking?.title ?? ''} onChangeText={(value) => setEditingBooking((current) => current ? { ...current, title: value } : current)} />
            <Field label="Date" value={editingBooking?.scheduledDate ?? ''} onChangeText={(value) => setEditingBooking((current) => current ? { ...current, scheduledDate: value } : current)} />
            <Field label="Target mileage" value={editingBooking?.targetMileage ?? ''} onChangeText={(value) => setEditingBooking((current) => current ? { ...current, targetMileage: value } : current)} />
            <Field label="Assign mechanic" value={editingBooking?.assignedMechanic ?? ''} onChangeText={(value) => setEditingBooking((current) => current ? { ...current, assignedMechanic: value } : current)} />
            <View style={styles.modalActions}><ModalButton label="Cancel" secondary onPress={() => setEditingBooking(null)} /><ModalButton label="Save changes" onPress={saveBooking} /></View>
          </ModalShell>
        </Modal>

        <Modal transparent visible={editingMechanic !== null} animationType="fade" onRequestClose={() => setEditingMechanic(null)}>
          <ModalShell title={mechanics.some((item) => item.id === editingMechanic?.id) ? 'Edit mechanic' : 'Add mechanic'} onClose={() => setEditingMechanic(null)}>
            <Field label="Name" value={editingMechanic?.name ?? ''} onChangeText={(value) => setEditingMechanic((current) => current ? { ...current, name: value } : current)} />
            <Field label="Specialty" value={editingMechanic?.specialty ?? ''} onChangeText={(value) => setEditingMechanic((current) => current ? { ...current, specialty: value } : current)} />
            <Field label="Working hours" value={editingMechanic?.hours ?? ''} onChangeText={(value) => setEditingMechanic((current) => current ? { ...current, hours: value } : current)} />
            <Field label="Maximum jobs" value={String(editingMechanic?.capacity ?? '')} onChangeText={(value) => setEditingMechanic((current) => current ? { ...current, capacity: Number(value) || 0 } : current)} numeric />
            <View style={styles.modalActions}><ModalButton label="Cancel" secondary onPress={() => setEditingMechanic(null)} /><ModalButton label="Save mechanic" onPress={saveMechanic} /></View>
          </ModalShell>
        </Modal>

        <Modal transparent visible={editingCatalog !== null} animationType="fade" onRequestClose={() => setEditingCatalog(null)}>
          <ModalShell title={catalog.some((item) => item.id === editingCatalog?.id) ? 'Edit catalog item' : 'Add service'} onClose={() => setEditingCatalog(null)}>
            <Field label="Service name" value={editingCatalog?.name ?? ''} onChangeText={(value) => setEditingCatalog((current) => current ? { ...current, name: value } : current)} />
            <Field label="Category" value={editingCatalog?.category ?? ''} onChangeText={(value) => setEditingCatalog((current) => current ? { ...current, category: value } : current)} />
            <Field label="Price (₱)" value={editingCatalog?.price ?? ''} onChangeText={(value) => setEditingCatalog((current) => current ? { ...current, price: value } : current)} numeric />
            <Field label="Maintenance interval" value={editingCatalog?.interval ?? ''} onChangeText={(value) => setEditingCatalog((current) => current ? { ...current, interval: value } : current)} />
            <Field label="Vehicle make/model or all" value={editingCatalog?.vehicleScope ?? ''} onChangeText={(value) => setEditingCatalog((current) => current ? { ...current, vehicleScope: value } : current)} />
            <View style={styles.modalActions}><ModalButton label="Cancel" secondary onPress={() => setEditingCatalog(null)} /><ModalButton label="Save service" onPress={saveCatalogItem} /></View>
          </ModalShell>
        </Modal>

        <Modal transparent visible={selectedCustomer !== undefined} animationType="fade" onRequestClose={() => setSelectedCustomerId(null)}>
          <ModalShell title="Customer account" onClose={() => setSelectedCustomerId(null)}>
            {selectedCustomer && <>
              <Text style={styles.detailName}>{selectedCustomer.name}</Text><Text style={styles.cardMeta}>{selectedCustomer.email}</Text><Text style={styles.cardMeta}>Status: {selectedCustomer.status} · Joined {selectedCustomer.joined}</Text>
              <Text style={styles.sectionTitle}>Vehicle profile preview</Text>
              {vehicles.map((vehicle) => <View key={vehicle.id} style={styles.vehicleLine}><Ionicons name="car-outline" size={16} color={colors.gold} /><Text style={styles.cardMeta}>{vehicle.vehicleName} · {vehicle.vehicleModel} · {vehicle.odometer}</Text></View>)}
              <Text style={styles.warningCaption}>Vehicle profiles are not linked to customer accounts in this frontend prototype.</Text>
              <Field label="Support note (session only)" value={supportNote} onChangeText={setSupportNote} />
              <View style={styles.modalActions}><ModalButton label="Close" secondary onPress={() => setSelectedCustomerId(null)} /><ModalButton label="Save support note" onPress={() => { if (supportNote.trim()) recordAudit(`Support note added for ${selectedCustomer.email}`); setSelectedCustomerId(null); }} /></View>
            </>}
          </ModalShell>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, tone, onPress }: { icon: string; label: string; value: number; tone: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.metricCard}><Ionicons name={icon as any} size={18} color={tone} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Pressable>;
}

function SectionHeading({ title, action, onPress }: { title: string; action: string; onPress: () => void }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text><Pressable accessibilityRole="button" onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable></View>;
}

function Avatar({ name }: { name: string }) {
  return <View style={styles.avatar}><Text style={styles.avatarText}>{name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</Text></View>;
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text></Pressable>;
}

function ActionButton({ label, icon, tone, onPress }: { label: string; icon: string; tone: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.actionButton, { backgroundColor: `${tone}18` }]}><Ionicons name={icon as any} size={16} color={tone} /><Text style={[styles.actionText, { color: tone }]}>{label}</Text></Pressable>;
}

function SmallAction({ label, icon, tone = colors.soft, onPress }: { label: string; icon: string; tone?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.smallAction}><Ionicons name={icon as any} size={14} color={tone} /><Text style={[styles.smallActionText, { color: tone }]}>{label}</Text></Pressable>;
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'Available' || status === 'Approved' || status === 'Confirmed' || status === 'Completed' ? colors.green : status === 'Cancelled' || status === 'Rejected' ? colors.red : status === 'Busy' || status === 'Pending' || status === 'In Progress' ? colors.gold : colors.muted;
  return <View style={[styles.statusPill, { borderColor: `${tone}55`, backgroundColor: `${tone}18` }]}><Text style={[styles.statusPillText, { color: tone }]}>{status}</Text></View>;
}

function BookingSummary({ booking }: { booking: ScheduledService }) {
  return <View style={styles.bookingSummary}><View style={styles.summaryIcon}><Ionicons name="calendar-outline" size={17} color={colors.gold} /></View><View style={styles.customerInfo}><Text style={styles.cardTitle}>{booking.title}</Text><Text style={styles.cardSubtitle}>{booking.scheduledDate} · {booking.vehicle}</Text></View><StatusPill status={booking.status ?? 'Pending'} /></View>;
}

function AuditRow({ item }: { item: AuditEntry }) {
  return <View style={styles.auditRow}><Ionicons name="time-outline" size={15} color={colors.gold} /><View style={styles.customerInfo}><Text style={styles.auditText}>{item.action}</Text><Text style={styles.auditTime}>{item.time}</Text></View></View>;
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.emptyState}><Ionicons name="file-tray-outline" size={30} color={colors.muted} /><Text style={styles.emptyText}>{text}</Text></View>;
}

function Field({ label, value, onChangeText, numeric = false }: { label: string; value: string; onChangeText: (value: string) => void; numeric?: boolean }) {
  return <View style={styles.fieldWrap}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={numeric ? 'numeric' : 'default'} placeholder={label} placeholderTextColor={colors.muted} style={styles.input} /></View>;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={onClose} style={styles.iconAction}><Ionicons name="close" size={20} color={colors.muted} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView></View></View>;
}

function ModalButton({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.modalButton, secondary && styles.modalButtonSecondary]}><Text style={[styles.modalButtonText, secondary && styles.modalButtonTextSecondary]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  brandMark: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 14, height: 52, justifyContent: 'center', width: 52 },
  brand: { color: colors.gold, fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginBottom: 25, marginTop: 12, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  securityNotice: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.09)', borderColor: 'rgba(242,188,57,0.2)', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 9, marginTop: 17, padding: 11 },
  securityNoticeText: { color: colors.soft, flex: 1, fontSize: 11, lineHeight: 16 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 12, flexDirection: 'row', gap: 0, justifyContent: 'center', marginTop: 20, minHeight: 50 },
  primaryButtonText: { color: colors.background, fontSize: 13, fontWeight: '800' }, pressed: { opacity: 0.78 }, backToLogin: { alignItems: 'center', marginTop: 14 }, hint: { color: colors.muted, fontSize: 11 },
  dashboard: { flex: 1, paddingHorizontal: 16, paddingTop: 14 }, topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  eyebrow: { color: colors.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 }, topActions: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  roleBadge: { backgroundColor: 'rgba(130,184,255,0.12)', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 }, roleBadgeText: { color: colors.blue, fontSize: 9, fontWeight: '800' }, logoutButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  tabScroll: { flexGrow: 0, flexShrink: 0 }, tabStrip: { gap: 4, paddingBottom: 9 }, tabButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 0, height: 40, justifyContent: 'center', paddingHorizontal: 6, width: 96 }, tabButtonActive: { backgroundColor: 'rgba(242,188,57,0.1)', borderColor: 'rgba(242,188,57,0.4)' }, tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' }, tabLabelActive: { color: colors.gold },
  smallBadge: { alignItems: 'center', backgroundColor: colors.red, borderRadius: 8, justifyContent: 'center', minWidth: 15, paddingHorizontal: 3, paddingVertical: 1, position: 'absolute', right: 2, top: 1 }, smallBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  sectionScroll: { flex: 1, alignSelf: 'stretch' }, content: { alignItems: 'stretch', gap: 6, paddingBottom: 14, paddingTop: 0 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, metricCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexBasis: '48%', flexGrow: 1, minHeight: 106, padding: 12 }, metricValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 7 }, metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 3 },
  revenueCard: { backgroundColor: '#22272d', borderColor: 'rgba(242,188,57,0.22)', borderRadius: 14, borderWidth: 1, marginTop: 1, padding: 15 }, revenueValue: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 7 }, mutedText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }, sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' }, sectionAction: { color: colors.gold, fontSize: 10, fontWeight: '800' },
  bookingSummary: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 9, padding: 10 }, summaryCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 13 }, summaryIcon: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 }, summaryCopy: { flex: 1 }, summaryCount: { color: colors.gold, fontSize: 23, fontWeight: '900' },
  filterRow: { flexDirection: 'row', gap: 4, marginVertical: 6 }, filterChip: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 99, borderWidth: 1, justifyContent: 'center', minWidth: 90, paddingHorizontal: 10, paddingVertical: 8 }, filterChipActive: { backgroundColor: 'rgba(242,188,57,0.12)', borderColor: 'rgba(242,188,57,0.4)' }, filterChipText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, filterChipTextActive: { color: colors.gold },
  applicantCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: 9, padding: 12 }, customerPress: { alignItems: 'center', flexDirection: 'row', gap: 9 }, avatar: { alignItems: 'center', backgroundColor: 'rgba(242,188,57,0.12)', borderRadius: 20, height: 38, justifyContent: 'center', width: 38 }, avatarText: { color: colors.gold, fontSize: 11, fontWeight: '800' }, customerInfo: { flex: 1 }, applicantName: { color: colors.text, fontSize: 12, fontWeight: '800' }, applicantEmail: { color: colors.muted, fontSize: 10, marginTop: 3 }, joined: { color: colors.muted, fontSize: 9 },
  actions: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 5, marginTop: 9, paddingTop: 8 }, actionButton: { alignItems: 'center', borderRadius: 9, flex: 1, flexDirection: 'row', gap: 0, justifyContent: 'center', minHeight: 36 }, actionText: { fontSize: 10, fontWeight: '800' }, statusText: { fontSize: 10, fontWeight: '800', marginTop: 9 },
  dataCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 13, borderWidth: 1, marginTop: 7, padding: 11 }, cardHeading: { alignItems: 'center', flexDirection: 'row', gap: 7 }, flexCopy: { flex: 1 }, cardTitle: { color: colors.text, fontSize: 12, fontWeight: '800' }, cardSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 }, cardMeta: { color: colors.soft, fontSize: 10, lineHeight: 14, marginTop: 6 }, statusPill: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 }, statusPillText: { fontSize: 9, fontWeight: '800' }, wrapActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 7 }, smallAction: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, flexDirection: 'row', gap: 0, justifyContent: 'center', minHeight: 32, minWidth: 100, paddingHorizontal: 7, paddingVertical: 5 }, smallActionText: { fontSize: 9, fontWeight: '700' },
  sectionToolbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }, addButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 9, flexDirection: 'row', gap: 0, minHeight: 34, paddingHorizontal: 10 }, addButtonText: { color: colors.background, fontSize: 10, fontWeight: '800' }, iconAction: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  searchInput: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, fontSize: 12, marginBottom: 5, minHeight: 44, paddingHorizontal: 12 }, emptyState: { alignItems: 'center', gap: 8, paddingVertical: 28 }, emptyText: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  auditRow: { alignItems: 'flex-start', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 9, marginTop: 7, padding: 10 }, auditText: { color: colors.soft, fontSize: 10, lineHeight: 15 }, auditTime: { color: colors.muted, fontSize: 9, marginTop: 3 },
  securityPanel: { backgroundColor: 'rgba(242,188,57,0.08)', borderColor: 'rgba(242,188,57,0.25)', borderRadius: 13, borderWidth: 1, padding: 13 }, securityPanelHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 }, warningCaption: { color: colors.gold, fontSize: 10, lineHeight: 15, marginTop: 8 }, vehicleLine: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 6 }, detailName: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.72)', flex: 1, justifyContent: 'center', padding: 18 }, modalCard: { backgroundColor: colors.card, borderColor: 'rgba(242,188,57,0.25)', borderRadius: 18, borderWidth: 1, maxHeight: '90%', maxWidth: 480, padding: 16, width: '100%' }, modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, modalTitle: { color: colors.text, fontSize: 16, fontWeight: '800' }, fieldWrap: { marginTop: 9 }, fieldLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 5, textTransform: 'uppercase' }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 9, borderWidth: 1, color: colors.text, fontSize: 12, minHeight: 42, paddingHorizontal: 10 }, modalActions: { flexDirection: 'row', gap: 5, marginTop: 12 }, modalButton: { alignItems: 'center', backgroundColor: colors.gold, borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 6 }, modalButtonSecondary: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 }, modalButtonText: { color: colors.background, fontSize: 10, fontWeight: '800', textAlign: 'center' }, modalButtonTextSecondary: { color: colors.soft },
});
