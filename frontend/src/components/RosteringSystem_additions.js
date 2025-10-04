// Add these imports at the top of RosteringSystem.js (after existing imports)
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { LoadingSpinner, SkeletonCard } from './ui/LoadingStates';
import ConfirmDialog from './ui/ConfirmDialog';

// ========================================
// Add these state variables after existing state (around line 24)
// ========================================
const [showCopyConfirm, setShowCopyConfirm] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [pendingAction, setPendingAction] = useState(null);

// ========================================
// Add keyboard shortcuts after useEffect hooks (around line 140)
// ========================================
useKeyboardShortcuts({
  'ctrl+s': (e) => {
    if (editMode) {
      toast.success('Auto-save triggered (Ctrl+S)');
      // Add actual save logic here if needed
    }
  },
  'esc': () => {
    if (editMode) {
      setEditMode(false);
      toast.info('Edit mode closed');
    }
  },
  'ctrl+e': () => {
    toggleEditMode();
  }
});

// ========================================
// Replace the copyToTemplate function (around line 354)
// ========================================
const copyToTemplate = async () => {
  setPendingAction(() => async () => {
    try {
      console.log('COPY TEMPLATE - Fetching Week A and Week B data');
      
      const timestamp = Date.now();
      const [weekARes, weekBRes] = await Promise.all([
        axios.get(`${API}/roster/weekA?t=${timestamp}`),
        axios.get(`${API}/roster/weekB?t=${timestamp}`)
      ]);
      
      const weekAData = weekARes.data || {};
      const weekBData = weekBRes.data || {};
      
      console.log('COPY TEMPLATE - Posting to Next A and Next B');
      await Promise.all([
        axios.post(`${API}/roster/nextA`, weekAData),
        axios.post(`${API}/roster/nextB`, weekBData)
      ]);
      
      console.log('COPY TEMPLATE - Copy completed successfully');
      queryClient.clear();
      
      toast.success('Copy Template Success! Week A → Next A, Week B → Next B');
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Copy Template error:', error);
      toast.error('Copy Template failed: ' + (error.response?.data?.message || error.message));
    }
  });
  setShowCopyConfirm(true);
};

// ========================================
// Update the queries to use optimized caching (replace lines 150-177)
// ========================================
// Batch fetch all data in parallel
const { 
  data: initialData, 
  isLoading: initialLoading, 
  error: initialError 
} = useQuery({
  queryKey: ['initialData'],
  queryFn: async () => {
    const [participantsRes, workersRes, locationsRes] = await Promise.all([
      axios.get(`${API}/participants`),
      axios.get(`${API}/workers`, { timeout: 10000 }),
      axios.get(`${API}/locations`, { timeout: 10000 })
    ]);
    return {
      participants: participantsRes.data,
      workers: workersRes.data,
      locations: locationsRes.data
    };
  },
  staleTime: 10 * 60 * 1000, // 10 minutes
  cacheTime: 15 * 60 * 1000, // 15 minutes
  refetchOnWindowFocus: false,
  retry: 2
});

const participants = initialData?.participants || [];
const workers = initialData?.workers || [];
const locations = initialData?.locations || [];
const participantsLoading = initialLoading;
const workersLoading = initialLoading;
const locationsLoading = initialLoading;
const participantsError = initialError;

// ========================================
// Add loading state (replace lines 401-408)
// ========================================
if (participantsLoading || initialLoading) {
  return (
    <div className="app-container">
      <header className="header">
        <div className="header-top">
          <h1 className="header-title">Support Management System</h1>
        </div>
      </header>
      <nav className="tab-nav">
        <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      </nav>
      <div className="tab-content">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

// ========================================
// Add ConfirmDialog components before the closing </div> of app-container
// ========================================
<ConfirmDialog
  isOpen={showCopyConfirm}
  onClose={() => setShowCopyConfirm(false)}
  onConfirm={pendingAction}
  title="Copy Template"
  message="Copy all Week A and Week B shifts to Next A and Next B?"
  confirmText="Copy Now"
  cancelText="Cancel"
  variant="info"
/>

