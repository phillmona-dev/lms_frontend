import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Icon = ({ d, size = 18, color = 'currentColor', strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  key:     "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5",
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  plus:    "M12 5v14M5 12h14",
  edit:    "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  check:   "M20 6L9 17l-5-5",
  x:       "M18 6L6 18M6 6l12 12",
  info:    "M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
  chevron: "M9 18l6-6-6-6",
  back:    "M19 12H5M12 19l-7-7 7-7",
};

export default function RbacManagement() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  const [loading, setLoading] = useState(true);
  const [privileges, setPrivileges] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'privilege', 'role', 'user-roles'
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({ name: '', description: '', privilegeIds: [] });
  const [selectedUserRoles, setSelectedUserRoles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, rRes, uRes] = await Promise.all([
        axios.get('/api/rbac/privileges'),
        axios.get('/api/rbac/roles'),
        axios.get('/api/rbac/users')
      ]);
      setPrivileges(pRes.data);
      setRoles(rRes.data);
      setUsers(uRes.data);
    } catch (err) {
      console.error("Failed to fetch RBAC data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    if (type === 'privilege') {
      setFormData({ name: item?.name || '', description: item?.description || '' });
    } else if (type === 'role') {
      setFormData({ 
        name: item?.name || '', 
        description: item?.description || '', 
        privilegeIds: item?.privileges?.map(p => p.id) || [] 
      });
    } else if (type === 'user-roles') {
      setSelectedUserRoles(item?.accessRoles?.map(r => r.id) || []);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalType === 'privilege') {
        if (editingItem) {
          await axios.put(`/api/rbac/privileges/${editingItem.id}`, formData);
        } else {
          await axios.post('/api/rbac/privileges', formData);
        }
      } else if (modalType === 'role') {
        if (editingItem) {
          await axios.put(`/api/rbac/roles/${editingItem.id}`, formData);
        } else {
          await axios.post('/api/rbac/roles', formData);
        }
      } else if (modalType === 'user-roles') {
        // Assign roles to user
        const currentRoles = editingItem.accessRoles?.map(r => r.id) || [];
        const toAdd = selectedUserRoles.filter(id => !currentRoles.includes(id));
        const toRemove = currentRoles.filter(id => !selectedUserRoles.includes(id));
        
        if (toAdd.length > 0) {
          await axios.post(`/api/rbac/users/${editingItem.publicId}/roles`, { roleIds: toAdd });
        }
        if (toRemove.length > 0) {
          await axios.delete(`/api/rbac/users/${editingItem.publicId}/roles`, { data: { roleIds: toRemove } });
        }
      }
      await fetchData();
      setShowModal(false);
    } catch (err) {
      alert("Operation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      await axios.delete(`/api/rbac/${type}s/${id}`);
      await fetchData();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const togglePrivilegeInRole = (pId) => {
    setFormData(prev => ({
      ...prev,
      privilegeIds: prev.privilegeIds.includes(pId) 
        ? prev.privilegeIds.filter(id => id !== pId)
        : [...prev.privilegeIds, pId]
    }));
  };

  const toggleRoleForUser = (rId) => {
    setSelectedUserRoles(prev => 
      prev.includes(rId) ? prev.filter(id => id !== rId) : [...prev, rId]
    );
  };

  if (loading && roles.length === 0) return <div className="flex-center full-screen">Loading System RBAC...</div>;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <Icon d={icons.back} size={16} />
            Back to Dashboard
          </Link>
          <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>RBAC Management</h1>
          <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '1.1rem' }}>Configure security roles, permissions and user access control.</p>
        </div>
        
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.4rem', borderRadius: '14px', gap: '0.25rem' }}>
          {[
            { id: 'roles', label: 'Roles', icon: icons.shield },
            { id: 'privileges', label: 'Privileges', icon: icons.key },
            { id: 'users', label: 'User Access', icon: icons.users },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#6366f1' : '#64748b',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: activeTab === tab.id ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none',
              transition: 'all 0.2s'
            }}>
              <Icon d={tab.icon} size={18} color={activeTab === tab.id ? '#6366f1' : '#64748b'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', overflow: 'hidden' }}>
        
        {/* PRIVILEGES TAB */}
        {activeTab === 'privileges' && (
          <div>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>System Privileges</h3>
                <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>Granular permissions that can be assigned to roles.</p>
              </div>
              <button onClick={() => handleOpenModal('privilege')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}>
                <Icon d={icons.plus} size={18} color="white" /> Add Privilege
              </button>
            </div>
            <div style={{ padding: '1.5rem 2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {privileges.map(p => (
                  <div key={p.id} style={{ 
                    padding: '1.25rem', borderRadius: '16px', border: '1px solid #f1f5f9', 
                    background: '#f8fafc', transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>{p.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenModal('privilege', p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><Icon d={icons.edit} size={16} /></button>
                        <button onClick={() => handleDelete('privilege', p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Icon d={icons.trash} size={16} /></button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{p.description}</p>
                  </div>
                ))}
                {privileges.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', gridColumn: '1/-1', color: '#94a3b8' }}>No privileges defined yet.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ROLES TAB */}
        {activeTab === 'roles' && (
          <div>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>RBAC Roles</h3>
                <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>Manage security groups and their associated authorities.</p>
              </div>
              <button onClick={() => handleOpenModal('role')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }}>
                <Icon d={icons.plus} size={18} color="white" /> Create Role
              </button>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                {roles.map(r => (
                  <div key={r.id} style={{ 
                    borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden',
                    transition: 'all 0.2s', display: 'flex', flexDirection: 'column'
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{r.name}</h4>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                          <button onClick={() => handleOpenModal('role', r)} style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6366f1' }}><Icon d={icons.edit} size={16} /></button>
                          <button onClick={() => handleDelete('role', r.id)} style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid #fee2e2', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}><Icon d={icons.trash} size={16} /></button>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{r.description}</p>
                    </div>
                    <div style={{ padding: '1.25rem', flex: 1 }}>
                      <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authorities ({r.privileges?.length || 0})</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>ROLE_{r.name}</span>
                        {r.privileges?.map(p => (
                          <span key={p.id} style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>{p.name}</span>
                        ))}
                        {(!r.privileges || r.privileges.length === 0) && <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>No privileges</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>
               <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>User Access Control</h3>
               <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>Assign RBAC roles to users and manage their effective permissions.</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '1.25rem 2.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>User</th>
                  <th style={{ padding: '1.25rem 2.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>Legacy Role</th>
                  <th style={{ padding: '1.25rem 2.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>RBAC Roles</th>
                  <th style={{ padding: '1.25rem 2.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.publicId} style={{ borderBottom: i < users.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '1.25rem 2.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '1.25rem 2.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.65rem', borderRadius: '20px' }}>{u.legacyRole}</span>
                    </td>
                    <td style={{ padding: '1.25rem 2.25rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {u.accessRoles?.map(r => (
                          <span key={r.id} style={{ fontSize: '0.75rem', fontWeight: 700, background: '#eef2ff', color: '#4f46e5', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>{r.name}</span>
                        ))}
                        {(!u.accessRoles || u.accessRoles.length === 0) && <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>No RBAC roles</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 2.25rem', textAlign: 'right' }}>
                      <button onClick={() => handleOpenModal('user-roles', u)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '10px' }}>Manage Roles</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '550px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>
                {modalType === 'user-roles' ? `Manage Roles for ${editingItem?.name}` : 
                 editingItem ? `Edit ${modalType === 'privilege' ? 'Privilege' : 'Role'}` : 
                 `Create New ${modalType === 'privilege' ? 'Privilege' : 'Role'}`}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><Icon d={icons.x} size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {modalType !== 'user-roles' ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase().replace(/\s+/g, '_')})} required placeholder={modalType === 'privilege' ? "e.g. COURSE_CREATE" : "e.g. TEACHER_ADMIN"} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} />
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Identifier usually in ALL_CAPS.</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 700 }}>Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required rows="3" placeholder="Explain what this allows..." style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', resize: 'none' }} />
                  </div>
                  {modalType === 'role' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 700 }}>Attach Privileges</label>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
                        {privileges.map(p => (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', borderRadius: '8px', background: formData.privilegeIds.includes(p.id) ? '#f0f9ff' : 'transparent', cursor: 'pointer', border: formData.privilegeIds.includes(p.id) ? '1px solid #bae6fd' : '1px solid transparent' }}>
                            <input type="checkbox" checked={formData.privilegeIds.includes(p.id)} onChange={() => togglePrivilegeInRole(p.id)} />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: formData.privilegeIds.includes(p.id) ? '#0369a1' : '#1e293b' }}>{p.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700 }}>Select Active Roles</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {roles.map(r => (
                      <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: selectedUserRoles.includes(r.id) ? '#eef2ff' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={selectedUserRoles.includes(r.id)} onChange={() => toggleRoleForUser(r.id)} />
                        <div>
                          <div style={{ fontWeight: 800, color: selectedUserRoles.includes(r.id) ? '#4338ca' : '#1e293b', fontSize: '0.95rem' }}>{r.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1, borderRadius: '12px' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 2, borderRadius: '12px' }}>
                  {isSubmitting ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
