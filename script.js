/**
 * TENTED️: Private Couple Chat — Core Application Logic
 * Pure Vanilla JavaScript (ES6+) with Supabase Client (ESM)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// =============================================================================
// 0. SUPABASE CREDENTIALS CONFIGURATION (PERMANENT SETUP)
// =============================================================================
// Paste your Supabase URL & Anon Key here so you NEVER have to enter them again!
// If left blank, it will fall back to environment variables or localStorage.
export const SUPABASE_CONFIG = {
  url: 'https://tmvbucpgzrccbbslksbv.supabase.co',      // e.g. 'https://your-project-id.supabase.co'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdmJ1Y3BnenJjY2Jic2xrc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1OTUyOTcsImV4cCI6MjEwODE3MTI5N30.IibKJtImOn6TZpJKD4DWoQNkjYIZbAjEPrbChMgK8Mk'  // e.g. 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

// =============================================================================
// 1. STATE MANAGEMENT
// =============================================================================
const state = {
  supabase: null,
  currentUser: null,
  myProfile: null,
  partnerProfile: null,
  messages: new Map(), // messageId -> MessageObject
  savedMessages: new Map(),
  retentionHours: 24,
  realtimeChannel: null,
  presenceTracked: false,
  signedUrlCache: new Map(), // image_path -> { url, expiresAt }
  selectedPhotoFile: null,
  activeFilter: 'all', // 'all' | 'photos' | 'text'
  deletingMessageId: null,
  expirationTickerInterval: null,
  partnerOnline: false,
  isLoadingOlder: false,
  hasOlderMessages: true,
  // Camera Disguise & Stealth Lock
  isUnlocked: false,
  targetView: 'auth', // 'app' | 'auth'
  cameraStream: null,
  cameraFacingMode: 'user', // 'user' (front) | 'environment' (back)
  cameraFlash: false,
  pinInput: '',
  recentSnapUrl: null,
  lastHoldTriggerTime: 0
};

// =============================================================================
// 2. DOM ELEMENTS
// =============================================================================
const DOM = {
  // Views
  cameraView: document.getElementById('cameraView'),
  authView: document.getElementById('authView'),
  appView: document.getElementById('appView'),

  // Camera Disguise Elements
  cameraViewport: document.getElementById('cameraViewport'),
  cameraVideo: document.getElementById('cameraVideo'),
  cameraCanvas: document.getElementById('cameraCanvas'),
  cameraGrid: document.getElementById('cameraGrid'),
  focusRing: document.getElementById('focusRing'),
  shutterFlash: document.getElementById('shutterFlash'),
  camFlashBtn: document.getElementById('camFlashBtn'),
  camFlashIcon: document.getElementById('camFlashIcon'),
  camSecretTriggerBtn: document.getElementById('camSecretTriggerBtn'),
  camFlipBtn: document.getElementById('camFlipBtn'),
  camFallback: document.getElementById('cameraFallback'),
  camRetryPermBtn: document.getElementById('camRetryPermBtn'),
  camGalleryBtn: document.getElementById('camGalleryBtn'),
  camGalleryThumb: document.getElementById('camGalleryThumb'),
  camGalleryPlaceholder: document.getElementById('camGalleryPlaceholder'),
  camShutterBtn: document.getElementById('camShutterBtn'),
  shutterRing: document.getElementById('shutterRing'),
  camFilterBtn: document.getElementById('camFilterBtn'),

  // Snap Preview Modal
  snapPreviewModal: document.getElementById('snapPreviewModal'),
  snapPreviewImg: document.getElementById('snapPreviewImg'),
  snapRetakeBtn: document.getElementById('snapRetakeBtn'),
  snapDownloadBtn: document.getElementById('snapDownloadBtn'),
  snapCloseBtn: document.getElementById('snapCloseBtn'),

  // PIN Unlock Modal
  pinUnlockModal: document.getElementById('pinUnlockModal'),
  pinLockIcon: document.getElementById('pinLockIcon'),
  pinDotsRow: document.getElementById('pinDotsRow'),
  pinDots: document.querySelectorAll('.pin-dot'),
  pinAlert: document.getElementById('pinAlert'),
  pinAlertText: document.getElementById('pinAlertText'),
  pinKeypad: document.getElementById('pinKeypad'),
  pinCancelBtn: document.getElementById('pinCancelBtn'),
  pinBackspaceBtn: document.getElementById('pinBackspaceBtn'),

  // Quick Camouflage Buttons
  lockToCameraBtn: document.getElementById('lockToCameraBtn'),
  authBackToCameraBtn: document.getElementById('authBackToCameraBtn'),

  // Stealth Disguise Settings
  pinActiveText: document.getElementById('pinActiveText'),
  toggleChangePinBtn: document.getElementById('toggleChangePinBtn'),
  changePinBox: document.getElementById('changePinBox'),
  oldPinInput: document.getElementById('oldPinInput'),
  newPinInput: document.getElementById('newPinInput'),
  confirmNewPinInput: document.getElementById('confirmNewPinInput'),
  cancelChangePinBtn: document.getElementById('cancelChangePinBtn'),
  saveNewPinBtn: document.getElementById('saveNewPinBtn'),
  autoLockOnTabLeave: document.getElementById('autoLockOnTabLeave'),
  testCamouflageBtn: document.getElementById('testCamouflageBtn'),

  // Auth Form
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  togglePasswordBtn: document.getElementById('togglePasswordBtn'),
  passwordEyeIcon: document.getElementById('passwordEyeIcon'),
  loginSubmitBtn: document.getElementById('loginSubmitBtn'),
  authAlert: document.getElementById('authAlert'),
  authAlertMsg: document.getElementById('authAlertMsg'),

  // Config Modal
  openConfigModalBtn: document.getElementById('openConfigModalBtn'),
  configModal: document.getElementById('configModal'),
  closeConfigModalBtn: document.getElementById('closeConfigModalBtn'),
  configForm: document.getElementById('configForm'),
  cfgSupabaseUrl: document.getElementById('cfgSupabaseUrl'),
  cfgSupabaseKey: document.getElementById('cfgSupabaseKey'),

  // App Header
  partnerAvatar: document.getElementById('partnerAvatar'),
  partnerOnlineDot: document.getElementById('partnerOnlineDot'),
  partnerDisplayName: document.getElementById('partnerDisplayName'),
  partnerRoleBadge: document.getElementById('partnerRoleBadge'),
  partnerStatusText: document.getElementById('partnerStatusText'),

  // Retention Dropdown
  retentionDropdownBtn: document.getElementById('retentionDropdownBtn'),
  currentRetentionText: document.getElementById('currentRetentionText'),
  retentionMenu: document.getElementById('retentionMenu'),
  retentionOption24: document.getElementById('retentionOption24'),
  retentionOption72: document.getElementById('retentionOption72'),

  // Saved Messages Drawer
  openSavedDrawerBtn: document.getElementById('openSavedDrawerBtn'),
  savedCountBadge: document.getElementById('savedCountBadge'),
  savedDrawerOverlay: document.getElementById('savedDrawerOverlay'),
  closeSavedDrawerBtn: document.getElementById('closeSavedDrawerBtn'),
  savedMessagesList: document.getElementById('savedMessagesList'),
  filterTabs: document.querySelectorAll('.filter-tab'),

  // Settings Modal
  openSettingsModalBtn: document.getElementById('openSettingsModalBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  settingsDisplayName: document.getElementById('settingsDisplayName'),
  saveProfileBtn: document.getElementById('saveProfileBtn'),
  emojiSelector: document.getElementById('emojiSelector'),
  currentUserEmail: document.getElementById('currentUserEmail'),
  currentUserRole: document.getElementById('currentUserRole'),
  logoutBtn: document.getElementById('logoutBtn'),

  // Lightbox Modal
  photoLightbox: document.getElementById('photoLightbox'),
  lightboxBackdrop: document.getElementById('lightboxBackdrop'),
  lightboxImage: document.getElementById('lightboxImage'),
  lightboxCaption: document.getElementById('lightboxCaption'),
  lightboxSaveBtn: document.getElementById('lightboxSaveBtn'),
  lightboxDownloadBtn: document.getElementById('lightboxDownloadBtn'),
  closeLightboxBtn: document.getElementById('closeLightboxBtn'),

  // Confirm Delete Modal
  confirmModal: document.getElementById('confirmModal'),
  confirmCancelBtn: document.getElementById('confirmCancelBtn'),
  confirmApproveBtn: document.getElementById('confirmApproveBtn'),

  // Chat Feed & Composer
  chatContainer: document.getElementById('chatContainer'),
  chatLoading: document.getElementById('chatLoading'),
  chatEmptyState: document.getElementById('chatEmptyState'),
  loadOlderWrapper: document.getElementById('loadOlderWrapper'),
  loadOlderBtn: document.getElementById('loadOlderBtn'),
  messagesFeed: document.getElementById('messagesFeed'),
  connectionAlert: document.getElementById('connectionAlert'),

  // Upload Preview Bar & Composer
  uploadPreviewBar: document.getElementById('uploadPreviewBar'),
  previewImgElement: document.getElementById('previewImgElement'),
  previewFileName: document.getElementById('previewFileName'),
  previewFileSize: document.getElementById('previewFileSize'),
  uploadProgressBarTrack: document.getElementById('uploadProgressBarTrack'),
  uploadProgressFill: document.getElementById('uploadProgressFill'),
  uploadStatusText: document.getElementById('uploadStatusText'),
  cancelUploadBtn: document.getElementById('cancelUploadBtn'),
  photoFileInput: document.getElementById('photoFileInput'),
  attachPhotoBtn: document.getElementById('attachPhotoBtn'),
  composerForm: document.getElementById('composerForm'),
  messageTextInput: document.getElementById('messageTextInput'),
  sendBtn: document.getElementById('sendBtn'),

  // Floating Hearts
  floatingHearts: document.getElementById('floatingHearts'),

  // Floating Action Menu & Toast
  messageActionMenu: document.getElementById('messageActionMenu'),
  menuSaveActionBtn: document.getElementById('menuSaveActionBtn'),
  menuSaveIcon: document.getElementById('menuSaveIcon'),
  menuSaveText: document.getElementById('menuSaveText'),
  menuCopyActionBtn: document.getElementById('menuCopyActionBtn'),
  actionToast: document.getElementById('actionToast'),
  toastIcon: document.getElementById('toastIcon'),
  toastMsg: document.getElementById('toastMsg')
};

// =============================================================================
// 3. INITIALIZATION & CONFIGURATION RESOLUTION
// =============================================================================
async function initializeApp() {
  refreshLucideIcons();
  startFloatingHearts();

  // 1. Initialize Stealth Camera Disguise & PIN verification
  initCameraDisguise();

  // 2. Open directly into Camera Disguise mode by default!
  showView('camera');
  startCameraStream();

  // Resolve Supabase credentials:
  // 1. Hardcoded SUPABASE_CONFIG (permanent setup in script.js)
  // 2. window.__ENV__ or import.meta.env (if running in bundler/Vercel)
  // 3. localStorage (cached credentials)
  const url = (SUPABASE_CONFIG.url && SUPABASE_CONFIG.url.trim() !== '')
    ? SUPABASE_CONFIG.url.trim()
    : (getEnvVar('VITE_SUPABASE_URL') || localStorage.getItem('tented_supabase_url') || '');

  const key = (SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey.trim() !== '')
    ? SUPABASE_CONFIG.anonKey.trim()
    : (getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || localStorage.getItem('tented_supabase_key') || '');

  if (DOM.cfgSupabaseUrl) DOM.cfgSupabaseUrl.value = url;
  if (DOM.cfgSupabaseKey) DOM.cfgSupabaseKey.value = key;

  if (url && key) {
    try {
      // Auto-save to localStorage so session persists even if script is reloaded
      localStorage.setItem('tented_supabase_url', url);
      localStorage.setItem('tented_supabase_key', key);
      setupSupabaseClient(url, key);
      await checkExistingSession();
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      showAuthAlert('Invalid Supabase configuration. Please check your URL and Anon Key.');
    }
  } else {
    state.targetView = 'auth';
    if (state.isUnlocked) {
      showView('auth');
    }
  }

  setupEventListeners();
}

function getEnvVar(name) {
  // Support Vite import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
  } catch (e) { }

  // Support window.__ENV__
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[name]) {
    return window.__ENV__[name];
  }

  return null;
}

function setupSupabaseClient(url, key) {
  state.supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}

// =============================================================================
// 4. AUTHENTICATION & ALLOWLIST ENFORCEMENT
// =============================================================================
async function checkExistingSession() {
  if (!state.supabase) return;

  const { data: { session }, error } = await state.supabase.auth.getSession();
  if (error) {
    console.error('Error fetching session:', error);
    state.targetView = 'auth';
    if (state.isUnlocked) showView('auth');
    return;
  }

  if (session && session.user) {
    await handleUserAuthenticated(session.user);
  } else {
    state.targetView = 'auth';
    if (state.isUnlocked) showView('auth');
  }

  // Auth state change listener
  state.supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if (event === 'SIGNED_IN' && currentSession?.user) {
      await handleUserAuthenticated(currentSession.user);
    } else if (event === 'SIGNED_OUT') {
      handleUserLoggedOut();
    }
  });
}

async function handleUserAuthenticated(user) {
  if (!user) return;
  // Prevent duplicate execution if already authenticated and inside app
  if (state.currentUser?.id === user.id && DOM.appView.style.display === 'flex') {
    return;
  }
  state.currentUser = user;

  // CRITICAL SECURITY REQUIREMENT:
  // Query couple_members allowlist table. If current user is not in the allowlist,
  // deny access immediately, terminate auth session, and display warning.
  try {
    console.log('Tented Auth: Verifying couple_members for User ID:', user.id, 'Email:', user.email);

    const { data: members, error } = await state.supabase
      .from('couple_members')
      .select('*');

    console.log('Tented Auth: Fetch result:', { members, error });

    if (error) {
      console.error('Allowlist verification error:', error);
      await state.supabase.auth.signOut();
      showAuthAlert('Sanctuary Access Denied: Database policy restriction. Please ensure your account is registered in couple_members.');
      state.targetView = 'auth';
      if (state.isUnlocked) showView('auth');
      return;
    }

    if (!members || members.length === 0) {
      console.warn('Tented Auth: No members returned from couple_members table! Check RLS policy or verify logged-in UID.');
      await state.supabase.auth.signOut();
      showAuthAlert('Sanctuary Unconfigured: No authorized couple members found. If rows exist in Supabase, update the RLS select policy on couple_members.');
      state.targetView = 'auth';
      if (state.isUnlocked) showView('auth');
      return;
    }

    const myProfile = members.find(m => m.user_id === user.id);
    if (!myProfile) {
      console.warn('Tented Auth: Logged in user UID (' + user.id + ') does not match any couple_members row:', members);
      await state.supabase.auth.signOut();
      showAuthAlert('Access Denied: Logged in account (' + (user.email || user.id) + ') is not registered in the couple allowlist.');
      state.targetView = 'auth';
      if (state.isUnlocked) showView('auth');
      return;
    }

    // Current user is authorized!
    state.myProfile = myProfile;
    state.partnerProfile = members.find(m => m.user_id !== user.id) || null;

    updateHeaderProfiles();
    state.targetView = 'app';
    if (state.isUnlocked) {
      showView('app');
    }

    // Load initial sanctuary state
    await loadChatSettings();
    await loadInitialMessages();
    setupRealtimeSubscription();
    startExpirationTicker();
    triggerStorageGarbageCollection();

  } catch (err) {
    console.error('Error during allowlist verification:', err);
    await state.supabase.auth.signOut();
    showAuthAlert('Authentication verification failed: ' + err.message);
    state.targetView = 'auth';
    if (state.isUnlocked) showView('auth');
  }
}

function handleUserLoggedOut() {
  teardownRealtimeSubscription();
  stopExpirationTicker();
  state.currentUser = null;
  state.myProfile = null;
  state.partnerProfile = null;
  state.messages.clear();
  state.savedMessages.clear();
  state.signedUrlCache.clear();
  DOM.messagesFeed.innerHTML = '';
  state.targetView = 'auth';
  if (state.isUnlocked) {
    showView('auth');
  } else {
    showView('camera');
  }
}

function updateHeaderProfiles() {
  if (state.partnerProfile) {
    if (DOM.partnerAvatar) DOM.partnerAvatar.textContent = state.partnerProfile.avatar_emoji || '👸';
    if (DOM.partnerDisplayName) DOM.partnerDisplayName.textContent = state.partnerProfile.display_name || 'My Love';
    if (DOM.partnerRoleBadge) DOM.partnerRoleBadge.textContent = state.partnerProfile.role === 'partner_1' ? 'Partner 1' : 'Partner 2';
  } else {
    if (DOM.partnerAvatar) DOM.partnerAvatar.textContent = '💖';
    if (DOM.partnerDisplayName) DOM.partnerDisplayName.textContent = 'Awaiting Partner';
    if (DOM.partnerRoleBadge) DOM.partnerRoleBadge.textContent = 'Partner';
  }

  // Update Settings Modal
  if (DOM.currentUserEmail) DOM.currentUserEmail.textContent = `Signed in as: ${state.currentUser.email}`;
  if (DOM.currentUserRole) DOM.currentUserRole.textContent = `Role: ${state.myProfile.role} (${state.myProfile.display_name})`;
  if (DOM.settingsDisplayName) DOM.settingsDisplayName.value = state.myProfile.display_name || '';

  // Highlight active avatar emoji in settings
  if (DOM.emojiSelector) {
    const emojiBtns = DOM.emojiSelector.querySelectorAll('.emoji-btn');
    emojiBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.emoji === state.myProfile.avatar_emoji);
    });
  }
}

// =============================================================================
// 5. CHAT SETTINGS & EXPIRATION POLICY
// =============================================================================
async function loadChatSettings() {
  if (!state.supabase) return;

  const { data, error } = await state.supabase
    .from('chat_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Failed to load chat settings:', error);
    return;
  }

  if (data) {
    applyRetentionHours(data.retention_hours);
  }
}

function applyRetentionHours(hours) {
  state.retentionHours = Number(hours) || 24;
  if (DOM.currentRetentionText) {
    DOM.currentRetentionText.textContent = `${state.retentionHours} Hours`;
  }

  if (DOM.retentionOption24) DOM.retentionOption24.classList.toggle('active', state.retentionHours === 24);
  if (DOM.retentionOption72) DOM.retentionOption72.classList.toggle('active', state.retentionHours === 72);

  const check24 = DOM.retentionOption24 ? DOM.retentionOption24.querySelector('.item-check') : null;
  const check72 = DOM.retentionOption72 ? DOM.retentionOption72.querySelector('.item-check') : null;
  if (check24) check24.style.display = state.retentionHours === 24 ? 'block' : 'none';
  if (check72) check72.style.display = state.retentionHours === 72 ? 'block' : 'none';
}

async function updateRetentionSetting(newHours) {
  if (!state.supabase || state.retentionHours === newHours) return;

  try {
    const { error } = await state.supabase
      .from('chat_settings')
      .update({
        retention_hours: newHours,
        updated_at: new Date().toISOString(),
        updated_by: state.currentUser.id
      })
      .eq('id', 1);

    if (error) throw error;
    applyRetentionHours(newHours);
    DOM.retentionMenu.style.display = 'none';
  } catch (err) {
    alert('Failed to update expiration policy: ' + err.message);
  }
}

// =============================================================================
// 6. MESSAGING & REALTIME SUBSCRIPTION
// =============================================================================
async function loadInitialMessages() {
  if (!state.supabase) return;

  DOM.chatLoading.style.display = 'flex';
  DOM.chatEmptyState.style.display = 'none';

  try {
    // Load all active messages in chronological order (No row limits!)
    const { data: messages, error } = await state.supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    state.messages.clear();
    state.savedMessages.clear();

    const now = new Date();
    (messages || []).forEach(msg => {
      // Filter out client-side expired messages (database RLS also filters them)
      if (!msg.is_saved && new Date(msg.expires_at) <= now) {
        return;
      }
      state.messages.set(msg.id, msg);
      if (msg.is_saved) {
        state.savedMessages.set(msg.id, msg);
      }
    });

    renderAllMessages();
    updateSavedCountBadge();
    scrollToBottom(false);

    // Also run server-side expiration cleanup RPC safely
    await state.supabase.rpc('cleanup_expired_messages').catch(err => {
      console.warn('Background cleanup RPC notice:', err.message);
    });

  } catch (err) {
    console.error('Error loading messages:', err);
  } finally {
    DOM.chatLoading.style.display = 'none';
    checkEmptyState();
  }
}

function setupRealtimeSubscription() {
  if (!state.supabase || state.realtimeChannel) return;

  state.realtimeChannel = state.supabase.channel('tented-couple-sanctuary')
    // 1. Messages Changes (INSERT, UPDATE, DELETE)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      handleIncomingMessage(payload.new);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
      handleUpdatedMessage(payload.new);
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
      handleDeletedMessage(payload.old);
    })
    // 2. Chat Settings Changes
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_settings' }, payload => {
      if (payload.new && payload.new.retention_hours) {
        applyRetentionHours(payload.new.retention_hours);
      }
    })
    // 3. Presence Tracking (Online / Offline status)
    .on('presence', { event: 'sync' }, () => {
      handlePresenceSync();
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        DOM.connectionAlert.style.display = 'none';
        // Track current user presence
        await state.realtimeChannel.track({
          user_id: state.currentUser.id,
          online_at: new Date().toISOString()
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        DOM.connectionAlert.style.display = 'flex';
      }
    });
}

function teardownRealtimeSubscription() {
  if (state.realtimeChannel && state.supabase) {
    state.supabase.removeChannel(state.realtimeChannel);
    state.realtimeChannel = null;
  }
}

function handlePresenceSync() {
  if (!state.realtimeChannel) return;
  const presenceState = state.realtimeChannel.presenceState();
  const allPresences = Object.values(presenceState).flat();

  // Check if partner is present
  const isPartnerOnline = allPresences.some(p => p.user_id !== state.currentUser.id);
  state.partnerOnline = isPartnerOnline;

  if (DOM.partnerOnlineDot) {
    DOM.partnerOnlineDot.classList.toggle('online', isPartnerOnline);
    DOM.partnerOnlineDot.classList.toggle('offline', !isPartnerOnline);
  }
  if (DOM.partnerStatusText) {
    DOM.partnerStatusText.textContent = isPartnerOnline ? 'Together now • Realtime Live' : 'Away • Realtime Active';
  }
}

function handleIncomingMessage(newMsg) {
  if (!newMsg || state.messages.has(newMsg.id)) return;

  state.messages.set(newMsg.id, newMsg);
  if (newMsg.is_saved) {
    state.savedMessages.set(newMsg.id, newMsg);
    updateSavedCountBadge();
  }

  appendMessageElement(newMsg);
  checkEmptyState();
  scrollToBottom(true);
}

function handleUpdatedMessage(updatedMsg) {
  if (!updatedMsg) return;

  state.messages.set(updatedMsg.id, updatedMsg);

  if (updatedMsg.is_saved) {
    state.savedMessages.set(updatedMsg.id, updatedMsg);
  } else {
    state.savedMessages.delete(updatedMsg.id);
  }
  updateSavedCountBadge();

  // Re-render single message row
  const existingRow = document.getElementById(`msg-${updatedMsg.id}`);
  if (existingRow) {
    const newElement = createMessageElement(updatedMsg);
    existingRow.replaceWith(newElement);
    refreshLucideIcons();
  }

  // Update in saved drawer if open
  if (DOM.savedDrawerOverlay.style.display !== 'none') {
    renderSavedMessages();
  }
}

function handleDeletedMessage(oldMsg) {
  if (!oldMsg) return;

  state.messages.delete(oldMsg.id);
  state.savedMessages.delete(oldMsg.id);
  updateSavedCountBadge();

  const existingRow = document.getElementById(`msg-${oldMsg.id}`);
  if (existingRow) {
    existingRow.remove();
  }
  checkEmptyState();

  if (DOM.savedDrawerOverlay.style.display !== 'none') {
    renderSavedMessages();
  }
}

// =============================================================================
// 7. MESSAGE RENDERING & FORMATTING
// =============================================================================
function renderAllMessages() {
  DOM.messagesFeed.innerHTML = '';
  const sortedMessages = Array.from(state.messages.values())
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  sortedMessages.forEach(msg => {
    const el = createMessageElement(msg);
    DOM.messagesFeed.appendChild(el);
  });

  refreshLucideIcons();
}

function createMessageElement(msg) {
  const isSentByMe = msg.sender_id === state.currentUser.id;
  const row = document.createElement('div');
  row.className = `message-row ${isSentByMe ? 'sent' : 'received'}`;
  row.id = `msg-${msg.id}`;

  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.className = 'message-bubble-wrapper';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Photo Attachment
  if (msg.image_path) {
    const photoBox = document.createElement('div');
    photoBox.className = 'message-photo-wrapper';

    // Skeleton placeholder while signed URL is fetched
    const skeleton = document.createElement('div');
    skeleton.className = 'photo-skeleton';
    skeleton.innerHTML = '<span class="romantic-spinner" style="width:20px;height:20px;"></span>';
    photoBox.appendChild(skeleton);

    // Resolve private signed URL
    resolvePrivateSignedUrl(msg.image_path).then(url => {
      if (url) {
        skeleton.remove();
        const img = document.createElement('img');
        img.className = 'message-photo';
        img.src = url;
        img.alt = 'Private couple memory';
        img.loading = 'lazy';
        img.onclick = () => {
          if (Date.now() - state.lastHoldTriggerTime < 500) return;
          openLightbox(url, msg);
        };
        photoBox.appendChild(img);
      }
    });

    bubble.appendChild(photoBox);
  }

  // Text Body
  if (msg.body) {
    const textNode = document.createElement('div');
    textNode.className = 'message-text';
    textNode.textContent = msg.body;
    bubble.appendChild(textNode);
  }

  // If message is saved, attach subtle persistent romantic heart badge to bubble
  if (msg.is_saved) {
    const savedBadge = document.createElement('div');
    savedBadge.className = 'message-saved-badge';
    savedBadge.title = 'Saved memory • Click or hold to manage';
    savedBadge.innerHTML = '<i data-lucide="heart" class="icon-xs" fill="currentColor"></i>';
    savedBadge.onclick = (e) => {
      e.stopPropagation();
      openMessageActionMenu(msg, bubble);
    };
    bubble.appendChild(savedBadge);
  }

  // Setup Hold / Long-press listener for Save Options Menu
  setupMessageHold(bubble, msg);

  bubbleWrapper.appendChild(bubble);

  // Footer: (Static time, expiration pill, and static save button commented out)
  const footer = document.createElement('div');
  footer.className = 'message-footer';

  // Timestamp (Static timestamp commented out — revealed on Instagram-style right-to-left swipe instead)
  /*
  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime(msg.created_at);
  footer.appendChild(timeSpan);
  */

  // Expiration Indicator (Commented out — hidden during chat as requested)
  /*
  const expSpan = document.createElement('span');
  expSpan.className = `expiration-badge ${msg.is_saved ? 'saved' : ''}`;
  expSpan.id = `exp-${msg.id}`;
  expSpan.innerHTML = msg.is_saved
    ? '<i data-lucide="bookmark" class="icon-xs"></i> Saved'
    : `<i data-lucide="hourglass" class="icon-xs"></i> ${calculateTimeRemaining(msg.expires_at)}`;
  footer.appendChild(expSpan);
  */

  // Save / Bookmark Action Button (Static button commented out — hold on message bubble to open save options)
  /*
  const saveBtn = document.createElement('button');
  saveBtn.className = `msg-action-btn ${msg.is_saved ? 'is-saved' : ''}`;
  saveBtn.title = msg.is_saved ? 'Unsave memory (restarts timer)' : 'Save memory permanently';
  saveBtn.innerHTML = `<i data-lucide="heart" class="icon-xs" ${msg.is_saved ? 'fill="currentColor"' : ''}></i>`;
  saveBtn.onclick = () => toggleSaveMessage(msg.id, msg.is_saved);
  footer.appendChild(saveBtn);
  */

  // Delete Action Button (Disabled/Commented out)
  /*
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'msg-action-btn msg-delete-btn';
  deleteBtn.title = 'Delete message';
  deleteBtn.innerHTML = '<i data-lucide="trash-2" class="icon-xs"></i>';
  deleteBtn.onclick = () => promptDeleteMessage(msg.id);
  footer.appendChild(deleteBtn);
  */

  if (footer.children.length > 0) {
    bubbleWrapper.appendChild(footer);
  }

  row.appendChild(bubbleWrapper);

  // Instagram-Style Swipe Timestamp (Reveals smoothly when dragging right-to-left)
  const swipeTime = document.createElement('div');
  swipeTime.className = 'message-swipe-timestamp';
  swipeTime.textContent = formatTime(msg.created_at);
  row.appendChild(swipeTime);

  return row;
}

function appendMessageElement(msg) {
  const el = createMessageElement(msg);
  DOM.messagesFeed.appendChild(el);
  refreshLucideIcons();
}

function checkEmptyState() {
  const hasMessages = state.messages.size > 0;
  DOM.chatEmptyState.style.display = hasMessages ? 'none' : 'flex';
}

function scrollToBottom(smooth = true) {
  DOM.chatContainer.scrollTo({
    top: DOM.chatContainer.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function calculateTimeRemaining(expiresAt) {
  if (!expiresAt) return '';
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return 'Expired';

  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m left`;
}

// Periodic ticker updating message expiration badges
function startExpirationTicker() {
  stopExpirationTicker();
  state.expirationTickerInterval = setInterval(() => {
    const now = Date.now();
    state.messages.forEach(msg => {
      if (msg.is_saved) return;

      const remainingMs = new Date(msg.expires_at).getTime() - now;
      if (remainingMs <= 0) {
        // Expired! Immediately remove from DOM
        state.messages.delete(msg.id);
        const row = document.getElementById(`msg-${msg.id}`);
        if (row) row.remove();
        checkEmptyState();
      } else {
        const badge = document.getElementById(`exp-${msg.id}`);
        if (badge) {
          badge.innerHTML = `<i data-lucide="hourglass" class="icon-xs"></i> ${calculateTimeRemaining(msg.expires_at)}`;
        }
      }
    });
    refreshLucideIcons();
  }, 30000); // Check every 30 seconds
}

function stopExpirationTicker() {
  if (state.expirationTickerInterval) {
    clearInterval(state.expirationTickerInterval);
    state.expirationTickerInterval = null;
  }
}

// =============================================================================
// 8. PRIVATE STORAGE & SIGNED URL MANAGEMENT
// =============================================================================
async function resolvePrivateSignedUrl(imagePath) {
  if (!imagePath || !state.supabase) return null;

  // Check cache first
  const cached = state.signedUrlCache.get(imagePath);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60000) { // 1 minute safety buffer
    return cached.url;
  }

  try {
    // Generate signed URL with 3600 seconds (1 hour) expiration
    const { data, error } = await state.supabase.storage
      .from('couple-photos')
      .createSignedUrl(imagePath, 3600);

    if (error) {
      console.error('Error creating signed URL for photo:', error);
      return null;
    }

    if (data?.signedUrl) {
      state.signedUrlCache.set(imagePath, {
        url: data.signedUrl,
        expiresAt: now + (3500 * 1000)
      });
      return data.signedUrl;
    }
  } catch (err) {
    console.error('Exception resolving signed URL:', err);
  }
  return null;
}

// Reliable garbage collection worker to purge storage photos for deleted/expired messages
async function triggerStorageGarbageCollection() {
  if (!state.supabase) return;

  try {
    const { data: queue, error } = await state.supabase.rpc('get_pending_photo_cleanups');
    if (error || !queue || queue.length === 0) return;

    const pathsToDelete = queue.map(item => item.image_path);
    const idsToMark = queue.map(item => item.id);

    // Delete from Supabase Storage bucket
    const { error: storageErr } = await state.supabase.storage
      .from('couple-photos')
      .remove(pathsToDelete);

    if (!storageErr) {
      await state.supabase.rpc('mark_photos_cleaned', { p_ids: idsToMark });
      console.log(`[Tented Storage Purge] Removed ${pathsToDelete.length} expired photos from vault.`);
    }
  } catch (err) {
    console.warn('[Tented Storage Purge notice]', err.message);
  }
}

// =============================================================================
// 9. PHOTO UPLOADS & MESSAGE COMPOSITION
// =============================================================================
async function handleSendMessage(e) {
  if (e) e.preventDefault();
  if (!state.supabase) return;

  const text = DOM.messageTextInput.value.trim();
  const file = state.selectedPhotoFile;

  if (!text && !file) return;

  DOM.sendBtn.disabled = true;

  try {
    let uploadedImagePath = null;

    // Handle Photo Upload
    if (file) {
      DOM.uploadStatusText.textContent = 'Encrypting & vaulting photo...';
      DOM.uploadProgressBarTrack.style.display = 'block';
      DOM.uploadProgressFill.style.width = '60%';

      const fileExt = file.name.split('.').pop() || 'jpg';
      const randomId = crypto.randomUUID();
      // Bucket storage path format: {sender_id}/{random_uuid}.{ext}
      uploadedImagePath = `${state.currentUser.id}/${randomId}.${fileExt}`;

      const { error: uploadError } = await state.supabase.storage
        .from('couple-photos')
        .upload(uploadedImagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        throw new Error('Photo upload failed: ' + uploadError.message);
      }

      DOM.uploadProgressFill.style.width = '100%';
    }

    // Insert Message into PostgreSQL
    // (Note: sender_id, expires_at, and is_saved are server-side computed & validated by Postgres triggers)
    const { data: insertedMsg, error: insertError } = await state.supabase
      .from('messages')
      .insert({
        sender_id: state.currentUser.id,
        body: text || null,
        image_path: uploadedImagePath
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Reset composer state
    DOM.messageTextInput.value = '';
    DOM.messageTextInput.style.height = 'auto';
    clearSelectedPhoto();

    // Optimistic fallback in case realtime event has latency
    if (insertedMsg) {
      handleIncomingMessage(insertedMsg);
    }

  } catch (err) {
    alert('Failed to send message: ' + err.message);
  } finally {
    updateSendButtonState();
  }
}

function handlePhotoSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate File Type
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  if (file.type && !validMimes.includes(file.type)) {
    alert('Please select an image file (JPG, PNG, WebP, GIF, HEIC).');
    DOM.photoFileInput.value = '';
    return;
  }

  // Max File Size: 50 MB (Supabase maximum)
  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    alert('Photo exceeds the 50 MB limit. Please select a photo under 50 MB.');
    DOM.photoFileInput.value = '';
    return;
  }

  state.selectedPhotoFile = file;

  // Display Preview Bar
  const reader = new FileReader();
  reader.onload = (e) => {
    DOM.previewImgElement.src = e.target.result;
    DOM.previewFileName.textContent = file.name;
    DOM.previewFileSize.textContent = formatBytes(file.size);
    DOM.uploadPreviewBar.style.display = 'flex';
    DOM.uploadStatusText.textContent = 'Ready to send';
    DOM.uploadProgressBarTrack.style.display = 'none';
    DOM.uploadProgressFill.style.width = '0%';
    updateSendButtonState();
  };
  reader.readAsDataURL(file);
}

function clearSelectedPhoto() {
  state.selectedPhotoFile = null;
  DOM.photoFileInput.value = '';
  DOM.uploadPreviewBar.style.display = 'none';
  DOM.previewImgElement.src = '';
  updateSendButtonState();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function updateSendButtonState() {
  const hasText = DOM.messageTextInput.value.trim().length > 0;
  const hasFile = state.selectedPhotoFile !== null;
  DOM.sendBtn.disabled = (!hasText && !hasFile);
}

// =============================================================================
// INSTAGRAM-STYLE SWIPE TO REVEAL TIMESTAMP & HOLD-TO-SAVE MENU
// =============================================================================
let activeMenuMsg = null;
let activeMenuBubble = null;
let toastTimeout = null;

function showActionToast(message, iconName = 'heart') {
  if (!DOM.actionToast || !DOM.toastMsg) return;
  DOM.toastMsg.textContent = message;
  if (DOM.toastIcon) {
    DOM.toastIcon.setAttribute('data-lucide', iconName);
  }
  refreshLucideIcons();
  DOM.actionToast.style.display = 'flex';
  DOM.actionToast.offsetHeight; // Force reflow
  DOM.actionToast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    DOM.actionToast.classList.remove('show');
    setTimeout(() => {
      DOM.actionToast.style.display = 'none';
    }, 260);
  }, 2200);
}

function openMessageActionMenu(msg, bubble) {
  if (!DOM.messageActionMenu || !bubble) return;
  activeMenuMsg = msg;
  activeMenuBubble = bubble;

  // Configure save button state
  if (DOM.menuSaveText && DOM.menuSaveIcon) {
    if (msg.is_saved) {
      DOM.menuSaveText.textContent = 'Unsave Memory';
      DOM.menuSaveIcon.setAttribute('data-lucide', 'heart-off');
      DOM.menuSaveActionBtn.classList.add('unsave-mode');
    } else {
      DOM.menuSaveText.textContent = 'Save to Memories';
      DOM.menuSaveIcon.setAttribute('data-lucide', 'heart');
      DOM.menuSaveActionBtn.classList.remove('unsave-mode');
    }
  }

  // Configure copy button state
  if (DOM.menuCopyActionBtn) {
    DOM.menuCopyActionBtn.style.display = (msg.body && msg.body.trim().length > 0) ? 'inline-flex' : 'none';
  }

  refreshLucideIcons();

  // Position menu relative to bubble
  const menu = DOM.messageActionMenu;
  menu.style.display = 'block';
  menu.style.visibility = 'hidden';

  const rect = bubble.getBoundingClientRect();
  const menuWidth = menu.offsetWidth || 190;
  const menuHeight = menu.offsetHeight || 44;

  let top = rect.top - menuHeight - 10;
  if (top < 65) {
    top = rect.bottom + 10;
  }

  let left;
  const isSent = bubble.closest('.message-row')?.classList.contains('sent');
  if (isSent) {
    left = rect.right - menuWidth;
  } else {
    left = rect.left;
  }

  const maxLeft = window.innerWidth - menuWidth - 12;
  left = Math.max(12, Math.min(maxLeft, left));

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.visibility = 'visible';
}

function closeMessageActionMenu() {
  if (DOM.messageActionMenu) {
    DOM.messageActionMenu.style.display = 'none';
  }
  activeMenuMsg = null;
  activeMenuBubble = null;
}

function initMessageActionMenu() {
  if (DOM.menuSaveActionBtn) {
    DOM.menuSaveActionBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!activeMenuMsg) return;
      const msg = activeMenuMsg;
      closeMessageActionMenu();
      await toggleSaveMessage(msg.id, msg.is_saved);
      showActionToast(msg.is_saved ? 'Memory unsaved' : 'Memory saved forever ❤️', msg.is_saved ? 'heart-crack' : 'heart');
    });
  }

  if (DOM.menuCopyActionBtn) {
    DOM.menuCopyActionBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!activeMenuMsg || !activeMenuMsg.body) return;
      try {
        await navigator.clipboard.writeText(activeMenuMsg.body);
        showActionToast('Message copied to clipboard', 'copy');
      } catch (err) {
        showActionToast('Failed to copy', 'alert-circle');
      }
      closeMessageActionMenu();
    });
  }

  // Dismiss on clicking outside
  document.addEventListener('pointerdown', (e) => {
    if (DOM.messageActionMenu && DOM.messageActionMenu.style.display !== 'none') {
      if (!DOM.messageActionMenu.contains(e.target) && !e.target.closest('.message-saved-badge')) {
        closeMessageActionMenu();
      }
    }
  });

  // Dismiss on chat scroll
  if (DOM.chatContainer) {
    DOM.chatContainer.addEventListener('scroll', () => {
      if (DOM.messageActionMenu && DOM.messageActionMenu.style.display !== 'none') {
        closeMessageActionMenu();
      }
    }, { passive: true });
  }

  // Dismiss on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMessageActionMenu();
  });
}

function setupMessageHold(bubble, msg) {
  let holdTimer = null;
  let startX = 0;
  let startY = 0;

  const startHold = (e) => {
    if (e.button && e.button !== 0) return;
    if (e.touches && e.touches.length > 1) return;

    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;

    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      state.lastHoldTriggerTime = Date.now();
      bubble.classList.add('is-holding');
      setTimeout(() => bubble.classList.remove('is-holding'), 200);
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (v) {}
      }
      openMessageActionMenu(msg, bubble);
    }, 450);
  };

  const cancelHold = (e) => {
    if (e && (e.type === 'touchmove' || e.type === 'mousemove')) {
      const currentX = e.touches ? e.touches[0].clientX : e.clientX;
      const currentY = e.touches ? e.touches[0].clientY : e.clientY;
      if (Math.hypot(currentX - startX, currentY - startY) > 8) {
        clearTimeout(holdTimer);
      }
      return;
    }
    clearTimeout(holdTimer);
  };

  bubble.addEventListener('touchstart', startHold, { passive: true });
  bubble.addEventListener('touchmove', cancelHold, { passive: true });
  bubble.addEventListener('touchend', cancelHold, { passive: true });
  bubble.addEventListener('touchcancel', cancelHold, { passive: true });

  bubble.addEventListener('mousedown', startHold);
  bubble.addEventListener('mousemove', cancelHold);
  bubble.addEventListener('mouseup', cancelHold);
  bubble.addEventListener('mouseleave', cancelHold);

  // Right-click support on desktop
  bubble.addEventListener('contextmenu', (e) => {
    if (window.getSelection()?.toString()?.trim().length > 0) {
      return;
    }
    e.preventDefault();
    clearTimeout(holdTimer);
    state.lastHoldTriggerTime = Date.now();
    openMessageActionMenu(msg, bubble);
  });
}

function initInstagramSwipeTimestamp() {
  const container = DOM.chatContainer;
  const feed = DOM.messagesFeed;
  if (!container || !feed) return;

  let startX = 0;
  let startY = 0;
  let isSwiping = false;
  let directionLocked = false;
  let isMouseDown = false;

  const MAX_SWIPE = 72;

  function handleStart(clientX, clientY) {
    startX = clientX;
    startY = clientY;
    isSwiping = false;
    directionLocked = false;
    feed.style.transition = 'none';
  }

  function handleMove(clientX, clientY, e) {
    const dx = clientX - startX;
    const dy = clientY - startY;

    if (!directionLocked) {
      if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) {
        directionLocked = true;
        isSwiping = false;
        return;
      }
      if (dx < -6 && Math.abs(dx) > Math.abs(dy)) {
        directionLocked = true;
        isSwiping = true;
        closeMessageActionMenu();
      }
    }

    if (isSwiping) {
      if (e.cancelable) e.preventDefault();
      const rawOffset = clientX - startX;

      if (rawOffset < 0) {
        let offset = rawOffset;
        if (-offset > MAX_SWIPE) {
          const extra = -offset - MAX_SWIPE;
          offset = -(MAX_SWIPE + extra * 0.22);
        }
        feed.style.transform = `translateX(${offset}px)`;
        const progress = Math.min(1, Math.abs(offset) / 35);
        feed.style.setProperty('--swipe-opacity', progress);
      } else {
        feed.style.transform = 'translateX(0px)';
        feed.style.setProperty('--swipe-opacity', '0');
      }
    }
  }

  function handleEnd() {
    if (isSwiping) {
      isSwiping = false;
      feed.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)';
      feed.style.transform = 'translateX(0px)';
      feed.style.setProperty('--swipe-opacity', '0');
      setTimeout(() => {
        feed.style.transition = '';
      }, 300);
    }
    directionLocked = false;
    isMouseDown = false;
    document.body.style.userSelect = '';
  }

  // Touch Events (Mobile)
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }
  }, { passive: false });

  container.addEventListener('touchend', handleEnd, { passive: true });
  container.addEventListener('touchcancel', handleEnd, { passive: true });

  // Mouse Events (Desktop)
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, textarea, a, .message-saved-badge, .message-action-menu')) return;
    isMouseDown = true;
    handleStart(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    if (!isSwiping && window.getSelection()?.toString()?.length > 0) {
      isMouseDown = false;
      return;
    }
    if (isSwiping) {
      document.body.style.userSelect = 'none';
    }
    handleMove(e.clientX, e.clientY, e);
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDown || isSwiping) {
      handleEnd();
    }
  });
}

// =============================================================================
// 10. SAVED MESSAGES (PERSISTENT SHARED SAVE)
// =============================================================================
async function toggleSaveMessage(messageId, currentlySaved) {
  if (!state.supabase) return;

  // Optimistic UI update
  const targetMsg = state.messages.get(messageId);
  const previousState = targetMsg ? targetMsg.is_saved : currentlySaved;
  if (targetMsg) {
    targetMsg.is_saved = !currentlySaved;
    handleUpdatedMessage(targetMsg);
  }

  try {
    if (currentlySaved) {
      // Unsave: Delete from message_saves
      // Triggers recalculate expires_at = now() + (retention_hours) and sets is_saved = false
      const { error } = await state.supabase
        .from('message_saves')
        .delete()
        .eq('message_id', messageId);

      if (error) throw error;
    } else {
      // Save: Insert into message_saves
      // Triggers update messages.is_saved = true, preventing automatic deletion
      const { error } = await state.supabase
        .from('message_saves')
        .insert({
          message_id: messageId,
          saved_by: state.currentUser.id
        });

      if (error) throw error;
    }
  } catch (err) {
    if (targetMsg) {
      targetMsg.is_saved = previousState;
      handleUpdatedMessage(targetMsg);
    }
    alert('Save state update error: ' + err.message);
  }
}

function updateSavedCountBadge() {
  const count = state.savedMessages.size;
  DOM.savedCountBadge.textContent = count;
  DOM.savedCountBadge.style.display = count > 0 ? 'flex' : 'none';
}

function renderSavedMessages() {
  DOM.savedMessagesList.innerHTML = '';
  const filter = state.activeFilter;

  let savedList = Array.from(state.savedMessages.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (filter === 'photos') {
    savedList = savedList.filter(m => !!m.image_path);
  } else if (filter === 'text') {
    savedList = savedList.filter(m => !m.image_path);
  }

  if (savedList.length === 0) {
    DOM.savedMessagesList.innerHTML = `
      <div style="text-align:center; padding: 40px 10px; color: var(--text-muted);">
        <i data-lucide="bookmark" class="icon-lg" style="margin-bottom:8px; opacity:0.4;"></i>
        <p>No saved ${filter} memories yet.<br>Click the heart icon on any message to protect it forever.</p>
      </div>
    `;
    refreshLucideIcons();
    return;
  }

  savedList.forEach(msg => {
    const card = document.createElement('div');
    card.className = 'saved-card';

    const header = document.createElement('div');
    header.className = 'saved-card-header';
    header.innerHTML = `
      <span>${formatTime(msg.created_at)}</span>
      <span class="text-pink">💖 Saved Forever</span>
    `;
    card.appendChild(header);

    if (msg.image_path) {
      resolvePrivateSignedUrl(msg.image_path).then(url => {
        if (url) {
          const img = document.createElement('img');
          img.className = 'saved-card-photo';
          img.src = url;
          img.alt = 'Saved private photo';
          img.onclick = () => openLightbox(url, msg);
          card.insertBefore(img, card.children[1] || null);
        }
      });
    }

    if (msg.body) {
      const content = document.createElement('div');
      content.className = 'saved-card-content';
      content.textContent = msg.body;
      card.appendChild(content);
    }

    const actions = document.createElement('div');
    actions.className = 'saved-card-actions';

    const unsaveBtn = document.createElement('button');
    unsaveBtn.className = 'btn btn-secondary btn-sm';
    unsaveBtn.innerHTML = '<i data-lucide="heart-off" class="icon-xs"></i> Unsave';
    unsaveBtn.onclick = () => toggleSaveMessage(msg.id, true);
    actions.appendChild(unsaveBtn);

    card.appendChild(actions);
    DOM.savedMessagesList.appendChild(card);
  });

  refreshLucideIcons();
}

// =============================================================================
// 11. MESSAGE DELETION (WITH CONFIRMATION)
// =============================================================================
function promptDeleteMessage(messageId) {
  state.deletingMessageId = messageId;
  DOM.confirmModal.style.display = 'flex';
}

async function confirmDeleteMessage() {
  if (!state.deletingMessageId || !state.supabase) return;

  const msgId = state.deletingMessageId;
  DOM.confirmModal.style.display = 'none';
  state.deletingMessageId = null;

  try {
    const { error } = await state.supabase
      .from('messages')
      .delete()
      .eq('id', msgId);

    if (error) throw error;
    // Realtime channel and storage triggers handle the rest!
  } catch (err) {
    alert('Failed to delete message: ' + err.message);
  }
}

// =============================================================================
// 12. FULLSCREEN PHOTO LIGHTBOX
// =============================================================================
function openLightbox(url, msg) {
  DOM.lightboxImage.src = url;
  DOM.lightboxDownloadBtn.href = url;
  DOM.lightboxCaption.textContent = msg.body ? msg.body.substring(0, 40) : 'Private Couple Photo';

  DOM.lightboxSaveBtn.onclick = () => toggleSaveMessage(msg.id, msg.is_saved);
  const heartIcon = DOM.lightboxSaveBtn.querySelector('i');
  if (heartIcon) {
    heartIcon.setAttribute('fill', msg.is_saved ? 'currentColor' : 'none');
  }

  DOM.photoLightbox.style.display = 'flex';
  refreshLucideIcons();
}

function closeLightbox() {
  DOM.photoLightbox.style.display = 'none';
  DOM.lightboxImage.src = '';
}

// =============================================================================
// 13. UI EVENT LISTENERS & HELPERS
// =============================================================================
function setupEventListeners() {
  // Login Form
  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthAlert();

    const email = DOM.loginEmail.value.trim();
    const password = DOM.loginPassword.value;

    if (!email || !password) {
      showAuthAlert('Please enter both email and secret password.');
      return;
    }

    if (!state.supabase) {
      showAuthAlert('Please configure your Supabase Project URL and Anon Key first.');
      DOM.configModal.style.display = 'flex';
      return;
    }

    DOM.loginSubmitBtn.disabled = true;
    DOM.loginSubmitBtn.querySelector('.btn-text').textContent = 'Authenticating...';

    const { data, error } = await state.supabase.auth.signInWithPassword({
      email,
      password
    });

    DOM.loginSubmitBtn.disabled = false;
    DOM.loginSubmitBtn.querySelector('.btn-text').textContent = 'Enter Sanctuary';

    if (error) {
      showAuthAlert(error.message || 'Invalid email or password.');
      return;
    }

    if (data?.user) {
      await handleUserAuthenticated(data.user);
    }
  });

  // Password visibility toggle
  DOM.togglePasswordBtn.addEventListener('click', () => {
    const isPassword = DOM.loginPassword.type === 'password';
    DOM.loginPassword.type = isPassword ? 'text' : 'password';
    DOM.passwordEyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
    refreshLucideIcons();
  });

  // Config Modal
  DOM.openConfigModalBtn.addEventListener('click', () => {
    DOM.configModal.style.display = 'flex';
  });

  DOM.closeConfigModalBtn.addEventListener('click', () => {
    DOM.configModal.style.display = 'none';
  });

  DOM.configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = DOM.cfgSupabaseUrl.value.trim();
    const key = DOM.cfgSupabaseKey.value.trim();

    if (!url || !key) return;

    localStorage.setItem('tented_supabase_url', url);
    localStorage.setItem('tented_supabase_key', key);
    setupSupabaseClient(url, key);
    DOM.configModal.style.display = 'none';
    hideAuthAlert();
    checkExistingSession();
  });

  // Retention Dropdown
  DOM.retentionDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = DOM.retentionMenu.style.display === 'block';
    DOM.retentionMenu.style.display = isVisible ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!DOM.retentionMenu.contains(e.target) && e.target !== DOM.retentionDropdownBtn) {
      DOM.retentionMenu.style.display = 'none';
    }
  });

  DOM.retentionOption24.addEventListener('click', () => updateRetentionSetting(24));
  DOM.retentionOption72.addEventListener('click', () => updateRetentionSetting(72));

  // Saved Drawer
  DOM.openSavedDrawerBtn.addEventListener('click', () => {
    renderSavedMessages();
    DOM.savedDrawerOverlay.style.display = 'flex';
  });

  DOM.closeSavedDrawerBtn.addEventListener('click', () => {
    DOM.savedDrawerOverlay.style.display = 'none';
  });

  DOM.savedDrawerOverlay.addEventListener('click', (e) => {
    if (e.target === DOM.savedDrawerOverlay) {
      DOM.savedDrawerOverlay.style.display = 'none';
    }
  });

  DOM.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      DOM.filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeFilter = tab.dataset.filter;
      renderSavedMessages();
    });
  });

  // Settings Modal
  DOM.openSettingsModalBtn.addEventListener('click', () => {
    DOM.settingsModal.style.display = 'flex';
  });

  DOM.closeSettingsModalBtn.addEventListener('click', () => {
    DOM.settingsModal.style.display = 'none';
  });

  DOM.settingsModal.addEventListener('click', (e) => {
    if (e.target === DOM.settingsModal) {
      DOM.settingsModal.style.display = 'none';
    }
  });

  // Profile Update in Settings
  DOM.emojiSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn) return;
    DOM.emojiSelector.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  DOM.saveProfileBtn.addEventListener('click', async () => {
    const newName = DOM.settingsDisplayName.value.trim() || 'My Love';
    const activeEmojiBtn = DOM.emojiSelector.querySelector('.emoji-btn.active');
    const newEmoji = activeEmojiBtn ? activeEmojiBtn.dataset.emoji : '💖';

    if (!state.supabase) return;

    try {
      const { error } = await state.supabase
        .from('couple_members')
        .update({
          display_name: newName,
          avatar_emoji: newEmoji
        })
        .eq('user_id', state.currentUser.id);

      if (error) throw error;
      state.myProfile.display_name = newName;
      state.myProfile.avatar_emoji = newEmoji;
      alert('Profile updated successfully!');
      DOM.settingsModal.style.display = 'none';
    } catch (err) {
      alert('Could not update profile: ' + err.message);
    }
  });

  // Logout
  DOM.logoutBtn.addEventListener('click', async () => {
    if (!state.supabase) return;
    DOM.settingsModal.style.display = 'none';
    await state.supabase.auth.signOut();
  });

  // Photo Lightbox
  DOM.closeLightboxBtn.addEventListener('click', closeLightbox);
  DOM.lightboxBackdrop.addEventListener('click', closeLightbox);

  // Confirm Delete
  DOM.confirmCancelBtn.addEventListener('click', () => {
    DOM.confirmModal.style.display = 'none';
    state.deletingMessageId = null;
  });

  DOM.confirmApproveBtn.addEventListener('click', confirmDeleteMessage);

  // Composer Input & Attachments
  DOM.composerForm.addEventListener('submit', handleSendMessage);
  DOM.attachPhotoBtn.addEventListener('click', () => DOM.photoFileInput.click());
  DOM.photoFileInput.addEventListener('change', handlePhotoSelected);
  DOM.cancelUploadBtn.addEventListener('click', clearSelectedPhoto);

  DOM.messageTextInput.addEventListener('input', () => {
    // Auto resize textarea height
    DOM.messageTextInput.style.height = 'auto';
    DOM.messageTextInput.style.height = `${Math.min(DOM.messageTextInput.scrollHeight, 120)}px`;
    updateSendButtonState();
  });

  DOM.messageTextInput.addEventListener('keydown', (e) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Instagram-style swipe timestamp & message hold menu
  initInstagramSwipeTimestamp();
  initMessageActionMenu();
}

// =============================================================================
// CAMERA DISGUISE (SNAPCHAT STYLE) & SECRET PIN SYSTEM
// =============================================================================

function initCameraDisguise() {
  // Query PIN dots
  DOM.pinDots = document.querySelectorAll('.pin-dot');

  // Camera Shutter Button & Ring
  if (DOM.camShutterBtn) {
    DOM.camShutterBtn.addEventListener('click', captureSnap);
  }
  if (DOM.shutterRing) {
    DOM.shutterRing.addEventListener('click', (e) => {
      if (e.target !== DOM.camShutterBtn) captureSnap();
    });
  }

  // Camera Flip Front/Back
  if (DOM.camFlipBtn) {
    DOM.camFlipBtn.addEventListener('click', flipCamera);
  }

  // Camera Flash Toggle
  if (DOM.camFlashBtn) {
    DOM.camFlashBtn.addEventListener('click', toggleCameraFlash);
  }

  // Camera Retry Permission
  if (DOM.camRetryPermBtn) {
    DOM.camRetryPermBtn.addEventListener('click', () => {
      startCameraStream();
    });
  }

  // Secret Disguise Trigger (Hidden button styled as HDR / PRO pill)
  if (DOM.camSecretTriggerBtn) {
    DOM.camSecretTriggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPinModal();
    });
  }

  // Secondary Secret Trigger: Triple click on camera top bar
  const cameraTopBar = document.querySelector('.camera-top-bar');
  if (cameraTopBar) {
    let clickCount = 0;
    let clickTimer = null;
    cameraTopBar.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 3) {
        clickCount = 0;
        openPinModal();
      } else {
        clickTimer = setTimeout(() => { clickCount = 0; }, 800);
      }
    });
  }

  // Interactive Viewfinder Tap: Focus Ring
  if (DOM.cameraViewport) {
    DOM.cameraViewport.addEventListener('click', (e) => {
      if (e.target.closest('.camera-top-bar') || 
          e.target.closest('.camera-bottom-bar') || 
          e.target.closest('.pin-modal-backdrop') || 
          e.target.closest('.snap-preview-modal')) {
        return;
      }
      showFocusRing(e.clientX, e.clientY);
    });
  }

  // Gallery button click: open preview of recent snap
  if (DOM.camGalleryBtn) {
    DOM.camGalleryBtn.addEventListener('click', () => {
      if (state.recentSnapUrl) {
        if (DOM.snapPreviewImg) DOM.snapPreviewImg.src = state.recentSnapUrl;
        if (DOM.snapDownloadBtn) DOM.snapDownloadBtn.href = state.recentSnapUrl;
        if (DOM.snapPreviewModal) DOM.snapPreviewModal.style.display = 'flex';
      }
    });
  }

  // Snap Preview Actions
  if (DOM.snapRetakeBtn) {
    DOM.snapRetakeBtn.addEventListener('click', closeSnapPreview);
  }
  if (DOM.snapCloseBtn) {
    DOM.snapCloseBtn.addEventListener('click', closeSnapPreview);
  }

  // Secret PIN Keypad Listeners
  if (DOM.pinKeypad) {
    DOM.pinKeypad.querySelectorAll('.keypad-btn[data-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePinDigit(btn.dataset.key);
      });
    });
  }

  if (DOM.pinBackspaceBtn) {
    DOM.pinBackspaceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handlePinBackspace();
    });
  }

  if (DOM.pinCancelBtn) {
    DOM.pinCancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePinModal();
    });
  }

  // Close PIN modal on backdrop click
  if (DOM.pinUnlockModal) {
    DOM.pinUnlockModal.addEventListener('click', (e) => {
      if (e.target === DOM.pinUnlockModal) {
        closePinModal();
      }
    });
  }

  // Keyboard shortcut listener (Physical keyboard typing for PIN & Space to Snap)
  document.addEventListener('keydown', (e) => {
    if (DOM.pinUnlockModal && DOM.pinUnlockModal.style.display === 'flex') {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePinModal();
      }
    } else if (DOM.cameraView && DOM.cameraView.style.display === 'flex') {
      if (e.code === 'Space' && (!DOM.snapPreviewModal || DOM.snapPreviewModal.style.display !== 'flex')) {
        e.preventDefault();
        captureSnap();
      }
    }
  });

  // Quick Camouflage / Lock buttons
  if (DOM.lockToCameraBtn) {
    DOM.lockToCameraBtn.addEventListener('click', lockToCamera);
  }
  if (DOM.authBackToCameraBtn) {
    DOM.authBackToCameraBtn.addEventListener('click', lockToCamera);
  }

  // Settings: Change PIN
  if (DOM.toggleChangePinBtn) {
    DOM.toggleChangePinBtn.addEventListener('click', () => {
      const isVisible = DOM.changePinBox && DOM.changePinBox.style.display === 'block';
      if (DOM.changePinBox) DOM.changePinBox.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && DOM.oldPinInput) {
        DOM.oldPinInput.value = '';
        DOM.newPinInput.value = '';
        DOM.confirmNewPinInput.value = '';
        DOM.oldPinInput.focus();
      }
    });
  }

  if (DOM.cancelChangePinBtn) {
    DOM.cancelChangePinBtn.addEventListener('click', () => {
      if (DOM.changePinBox) DOM.changePinBox.style.display = 'none';
    });
  }

  if (DOM.saveNewPinBtn) {
    DOM.saveNewPinBtn.addEventListener('click', handleSaveNewPin);
  }

  if (DOM.testCamouflageBtn) {
    DOM.testCamouflageBtn.addEventListener('click', () => {
      if (DOM.settingsModal) DOM.settingsModal.style.display = 'none';
      lockToCamera();
    });
  }

  if (DOM.autoLockOnTabLeave) {
    DOM.autoLockOnTabLeave.checked = localStorage.getItem('tented_autolock') !== 'false';
    DOM.autoLockOnTabLeave.addEventListener('change', (e) => {
      localStorage.setItem('tented_autolock', e.target.checked);
    });
  }

  // Auto-lock when tab is hidden or minimized
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const autolock = localStorage.getItem('tented_autolock') !== 'false';
      if (autolock && state.isUnlocked) {
        lockToCamera();
      }
    }
  });

  updatePinSettingsUI();
}

async function startCameraStream() {
  stopCameraStream();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraFallback('Camera API is not supported in this browser environment.');
    return;
  }

  try {
    const constraints = {
      video: {
        facingMode: { ideal: state.cameraFacingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.cameraStream = stream;

    if (DOM.cameraVideo) {
      DOM.cameraVideo.srcObject = stream;
      DOM.cameraVideo.style.transform = state.cameraFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
      await DOM.cameraVideo.play().catch(e => console.log('Autoplay notification:', e));
    }

    if (DOM.cameraFallback) {
      DOM.cameraFallback.style.display = 'none';
    }
  } catch (err) {
    console.warn('Camera access unavailable or declined:', err);
    showCameraFallback('Camera access needed to take live snaps. Tap below to retry.');
  }
}

function stopCameraStream() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => {
      try { track.stop(); } catch (e) {}
    });
    state.cameraStream = null;
  }
  if (DOM.cameraVideo) {
    DOM.cameraVideo.srcObject = null;
  }
}

function flipCamera() {
  state.cameraFacingMode = (state.cameraFacingMode === 'user') ? 'environment' : 'user';
  startCameraStream();
}

function toggleCameraFlash() {
  state.cameraFlash = !state.cameraFlash;
  if (DOM.camFlashIcon) {
    DOM.camFlashIcon.setAttribute('data-lucide', state.cameraFlash ? 'zap' : 'zap-off');
  }
  if (DOM.camFlashBtn) {
    DOM.camFlashBtn.classList.toggle('active', state.cameraFlash);
  }
  refreshLucideIcons();
}

function showFocusRing(x, y) {
  if (!DOM.focusRing) return;
  DOM.focusRing.style.left = `${x}px`;
  DOM.focusRing.style.top = `${y}px`;
  DOM.focusRing.style.display = 'block';
  DOM.focusRing.style.animation = 'none';
  DOM.focusRing.offsetHeight; // reflow
  DOM.focusRing.style.animation = 'focusPulse 0.85s ease-out forwards';

  setTimeout(() => {
    if (DOM.focusRing) DOM.focusRing.style.display = 'none';
  }, 900);
}

function captureSnap() {
  playShutterSound();
  if (navigator.vibrate) navigator.vibrate(50);

  // Flash overlay
  if (DOM.shutterFlash) {
    DOM.shutterFlash.classList.add('flash-active');
    setTimeout(() => {
      if (DOM.shutterFlash) DOM.shutterFlash.classList.remove('flash-active');
    }, 120);
  }

  // Draw snapshot onto canvas
  const canvas = DOM.cameraCanvas;
  if (!canvas) return;
  const video = DOM.cameraVideo;

  const width = video && video.videoWidth > 0 ? video.videoWidth : 1280;
  const height = video && video.videoHeight > 0 ? video.videoHeight : 720;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.save();

  if (state.cameraFacingMode === 'user' && video && video.videoWidth > 0) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  if (video && video.readyState >= 2 && video.videoWidth > 0) {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    // Fallback simulation pattern
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1f092b');
    grad.addColorStop(0.5, '#3b074d');
    grad.addColorStop(1, '#0c0418');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Captured Snapshot 📸', width / 2, height / 2);
  }
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  state.recentSnapUrl = dataUrl;

  if (DOM.camGalleryThumb) {
    DOM.camGalleryThumb.src = dataUrl;
    DOM.camGalleryThumb.style.display = 'block';
  }
  if (DOM.camGalleryPlaceholder) {
    DOM.camGalleryPlaceholder.style.display = 'none';
  }

  if (DOM.snapPreviewImg) DOM.snapPreviewImg.src = dataUrl;
  if (DOM.snapDownloadBtn) DOM.snapDownloadBtn.href = dataUrl;
  if (DOM.snapPreviewModal) DOM.snapPreviewModal.style.display = 'flex';
}

function closeSnapPreview() {
  if (DOM.snapPreviewModal) {
    DOM.snapPreviewModal.style.display = 'none';
  }
}

function showCameraFallback(msg) {
  if (DOM.cameraFallback) {
    DOM.cameraFallback.style.display = 'flex';
    const desc = DOM.cameraFallback.querySelector('.fallback-desc');
    if (desc && msg) desc.textContent = msg;
  }
}

// Realistic Web Audio API camera shutter mechanical click
function playShutterSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2100;
    filter.Q.value = 3.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(ctx.currentTime);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, ctx.currentTime + 0.038);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.075);
    oscGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.038);
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.075);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(ctx.currentTime + 0.038);
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

function playUnlockChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + (idx * 0.06);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (e) {}
}

// PIN Verification Functions
function openPinModal() {
  state.pinInput = '';
  updatePinDotsUI();
  if (DOM.pinAlert) DOM.pinAlert.style.display = 'none';
  if (DOM.pinUnlockModal) DOM.pinUnlockModal.style.display = 'flex';
}

function closePinModal() {
  state.pinInput = '';
  if (DOM.pinUnlockModal) DOM.pinUnlockModal.style.display = 'none';
}

function handlePinDigit(digit) {
  if (state.pinInput.length >= 4) return;
  state.pinInput += digit;
  updatePinDotsUI();

  if (navigator.vibrate) navigator.vibrate(20);

  if (state.pinInput.length === 4) {
    verifyPin();
  }
}

function handlePinBackspace() {
  if (state.pinInput.length > 0) {
    state.pinInput = state.pinInput.slice(0, -1);
    updatePinDotsUI();
    if (DOM.pinAlert) DOM.pinAlert.style.display = 'none';
  }
}

function updatePinDotsUI() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, index) => {
    dot.classList.toggle('filled', index < state.pinInput.length);
    dot.classList.remove('success');
  });
}

function verifyPin() {
  const savedPin = localStorage.getItem('tented_secret_pin') || '1234';

  if (state.pinInput === savedPin) {
    // PIN correct!
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach(dot => dot.classList.add('success'));
    playUnlockChime();
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);

    setTimeout(() => {
      state.isUnlocked = true;
      closePinModal();
      stopCameraStream();
      showView(state.targetView);
    }, 320);
  } else {
    // PIN incorrect
    if (DOM.pinDotsRow) DOM.pinDotsRow.classList.add('pin-dots-shake');
    if (DOM.pinAlert) {
      DOM.pinAlert.style.display = 'flex';
      DOM.pinAlertText.textContent = 'Incorrect PIN. Try again.';
    }
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    setTimeout(() => {
      if (DOM.pinDotsRow) DOM.pinDotsRow.classList.remove('pin-dots-shake');
      state.pinInput = '';
      updatePinDotsUI();
    }, 550);
  }
}

function lockToCamera() {
  state.isUnlocked = false;
  showView('camera');
  startCameraStream();
}

function handleSaveNewPin() {
  const oldPin = DOM.oldPinInput ? DOM.oldPinInput.value.trim() : '';
  const newPin = DOM.newPinInput ? DOM.newPinInput.value.trim() : '';
  const confirmPin = DOM.confirmNewPinInput ? DOM.confirmNewPinInput.value.trim() : '';
  const currentSavedPin = localStorage.getItem('tented_secret_pin') || '1234';

  if (oldPin !== currentSavedPin) {
    alert('Current PIN is incorrect! Please enter your existing 4-digit PIN.');
    return;
  }

  if (!/^\d{4}$/.test(newPin)) {
    alert('New PIN must be exactly 4 numeric digits (e.g. 5678).');
    return;
  }

  if (newPin !== confirmPin) {
    alert('New PIN and confirmation PIN do not match.');
    return;
  }

  localStorage.setItem('tented_secret_pin', newPin);
  alert('Secret 4-digit PIN updated successfully!');
  if (DOM.changePinBox) DOM.changePinBox.style.display = 'none';
  updatePinSettingsUI();
}

function updatePinSettingsUI() {
  if (DOM.pinActiveText) {
    const isCustom = localStorage.getItem('tented_secret_pin') && localStorage.getItem('tented_secret_pin') !== '1234';
    DOM.pinActiveText.textContent = isCustom
      ? 'Custom 4-Digit PIN Active'
      : '4-Digit PIN Active (Default: 1234)';
  }
}

function showView(view) {
  if (view === 'camera') {
    if (DOM.cameraView) DOM.cameraView.style.display = 'flex';
    if (DOM.authView) DOM.authView.style.display = 'none';
    if (DOM.appView) DOM.appView.style.display = 'none';
  } else if (view === 'auth') {
    if (DOM.cameraView) DOM.cameraView.style.display = 'none';
    if (DOM.authView) DOM.authView.style.display = 'flex';
    if (DOM.appView) DOM.appView.style.display = 'none';
  } else if (view === 'app') {
    if (DOM.cameraView) DOM.cameraView.style.display = 'none';
    if (DOM.authView) DOM.authView.style.display = 'none';
    if (DOM.appView) DOM.appView.style.display = 'flex';
  }
  refreshLucideIcons();
}

function showAuthAlert(msg) {
  DOM.authAlertMsg.textContent = msg;
  DOM.authAlert.style.display = 'flex';
}

function hideAuthAlert() {
  DOM.authAlert.style.display = 'none';
}

function refreshLucideIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// Romantic ambient floating hearts generator
function startFloatingHearts() {
  const container = DOM.floatingHearts;
  if (!container) return;

  const emojis = ['💖', '💕', '💗', '✨', '🌹', '💜'];

  setInterval(() => {
    if (document.hidden) return;
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    heart.style.left = `${Math.random() * 100}vw`;
    heart.style.animationDuration = `${8 + Math.random() * 8}s`;
    heart.style.fontSize = `${14 + Math.random() * 12}px`;
    container.appendChild(heart);

    setTimeout(() => heart.remove(), 16000);
  }, 2400);
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', initializeApp);
