import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Camera, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { profileApi, authApi, type ProfileUpdateData } from '../lib/api';

export function Settings() {
  const { user, updateUser, logout } = useAuth();
  const pictureRef = useRef<HTMLInputElement>(null);

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [headline, setHeadline] = useState(user?.headline ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [linkedin, setLinkedin] = useState(user?.linkedin_url ?? '');
  const [website, setWebsite] = useState(user?.website_url ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Picture
  const [picLoading, setPicLoading] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const data: ProfileUpdateData = {};
      if (name !== user?.name) data.name = name;
      if (phone !== (user?.phone ?? '')) data.phone = phone;
      if (headline !== (user?.headline ?? '')) data.headline = headline;
      if (location !== (user?.location ?? '')) data.location = location;
      if (linkedin !== (user?.linkedin_url ?? '')) data.linkedin_url = linkedin;
      if (website !== (user?.website_url ?? '')) data.website_url = website;

      const res = await profileApi.update(data);
      updateUser(res.profile);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: unknown) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save profile.' });
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPw('');
      setNewPw('');
    } catch (err: unknown) {
      setPwMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  }

  async function handlePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicLoading(true);
    try {
      const res = await profileApi.uploadPicture(file);
      updateUser(res.profile);
    } catch {
      // silent — user can retry
    } finally {
      setPicLoading(false);
      e.target.value = '';
    }
  }

  async function handleRemovePicture() {
    setPicLoading(true);
    try {
      await profileApi.removePicture();
      updateUser({ ...user!, picture: undefined });
    } finally {
      setPicLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await profileApi.delete(user?.auth_provider === 'email' ? deletePassword : undefined);
      logout();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  }

  const avatarSrc = user?.picture ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name ?? 'U')}`;

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-500">Manage your profile, security, and preferences.</p>
      </header>

      <div className="max-w-3xl space-y-8">

        {/* ─── Profile Information ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Personal Information</h2>
              <p className="text-xs text-gray-500">Your basic profile details.</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="p-8 space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden">
                  {picLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Loader2 size={22} className="animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => pictureRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-orange-500 shadow-sm transition-colors"
                >
                  <Camera size={13} />
                </button>
                <input ref={pictureRef} type="file" accept="image/*" className="hidden" onChange={handlePictureUpload} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Profile Picture</p>
                <p className="text-xs text-gray-400 mb-2">PNG or JPG, up to 5MB.</p>
                {user?.picture && (
                  <button
                    type="button"
                    onClick={handleRemovePicture}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website / Portfolio</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {profileMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                profileMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {profileMsg.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-7 py-3 rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-lg shadow-black/10 disabled:opacity-60"
              >
                {profileSaving && <Loader2 size={15} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>

        {/* ─── Security ─── */}
        {user?.auth_provider === 'email' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Shield size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">Security</h2>
                <p className="text-xs text-gray-500">Change your account password.</p>
              </div>
            </div>

            <form onSubmit={changePassword} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {pwMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                  pwMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {pwMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {pwMsg.text}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={pwSaving || !currentPw || !newPw}
                  className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-7 py-3 rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-lg shadow-black/10 disabled:opacity-50"
                >
                  {pwSaving && <Loader2 size={15} className="animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ─── Danger Zone ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-red-100 shadow-sm overflow-hidden"
        >
          <div className="px-8 py-6 border-b border-red-100 bg-red-50/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Danger Zone</h2>
              <p className="text-xs text-gray-500">Permanently delete your account and all data.</p>
            </div>
          </div>

          <div className="p-8">
            {!deleteConfirm ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Delete Account</p>
                  <p className="text-xs text-gray-400 mt-1">This action cannot be undone. All your data will be permanently removed.</p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="shrink-0 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-red-700 font-medium">Are you absolutely sure? Type your password to confirm.</p>
                {user?.auth_provider === 'email' && (
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-3 bg-gray-50 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                )}
                {deleteError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    <AlertCircle size={16} /> {deleteError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || (user?.auth_provider === 'email' && !deletePassword)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading && <Loader2 size={15} className="animate-spin" />}
                    Yes, Delete My Account
                  </button>
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteError(null); setDeletePassword(''); }}
                    className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}


