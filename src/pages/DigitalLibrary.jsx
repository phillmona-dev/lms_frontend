import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BookOpen,
  Download,
  Filter,
  Heart,
  LibraryBig,
  Plus,
  RefreshCcw,
  Search,
  Star,
  Undo2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ContextChatWidget from '../components/ContextChatWidget';

const roleOf = (user) => String(user?.legacyRole || user?.role || user?.roles?.[0]?.name || '').toUpperCase();

const toFormData = (metadata, file, cover) => {
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  if (file) formData.append('file', file);
  if (cover) formData.append('cover', cover);
  return formData;
};

const badgeClass = (resource) => {
  if (resource.available) return 'is-success';
  return 'is-warning';
};

export default function DigitalLibrary() {
  const { user } = useAuth();
  const role = roleOf(user);
  const canManage = ['SYSTEM_ADMINISTRATOR', 'SCHOOL_ADMINISTRATOR', 'TEACHER'].includes(role);

  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [myBorrows, setMyBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [subject, setSubject] = useState('ALL');
  const [gradeLevel, setGradeLevel] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [sort, setSort] = useState('recent');

  const [formOpen, setFormOpen] = useState(false);
  const [resourceFile, setResourceFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    description: '',
    resourceType: 'BOOK',
    category: '',
    subject: '',
    gradeLevel: '',
    tags: '',
    language: '',
    publicationYear: '',
    pages: '',
    externalUrl: '',
    accessType: 'DOWNLOAD_ONLY',
    totalCopies: 1,
  });

  const loadLibrary = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const params = { query, category, subject, gradeLevel, type, availability, sort };
      const [resourcesRes, categoriesRes, subjectsRes, gradesRes, dashboardRes, borrowsRes] = await Promise.all([
        axios.get('/api/library/resources', { params }),
        axios.get('/api/library/categories'),
        axios.get('/api/library/subjects'),
        axios.get('/api/library/grade-levels'),
        axios.get('/api/library/dashboard'),
        axios.get('/api/library/my/borrows'),
      ]);
      setResources(Array.isArray(resourcesRes.data) ? resourcesRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : Array.from(categoriesRes.data || []));
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : Array.from(subjectsRes.data || []));
      setGradeLevels(Array.isArray(gradesRes.data) ? gradesRes.data : Array.from(gradesRes.data || []));
      setDashboard(dashboardRes.data || null);
      setMyBorrows(Array.isArray(borrowsRes.data) ? borrowsRes.data : []);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to load library resources.' });
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadLibrary();
  };

  const resetForm = () => {
    setForm({
      title: '',
      author: '',
      publisher: '',
      isbn: '',
      description: '',
      resourceType: 'BOOK',
      category: '',
      subject: '',
      gradeLevel: '',
      tags: '',
      language: '',
      publicationYear: '',
      pages: '',
      externalUrl: '',
      accessType: 'DOWNLOAD_ONLY',
      totalCopies: 1,
    });
    setResourceFile(null);
    setCoverFile(null);
  };

  const handleCreateResource = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        ...form,
        publicationYear: form.publicationYear ? Number(form.publicationYear) : null,
        pages: form.pages ? Number(form.pages) : null,
        totalCopies: form.totalCopies ? Number(form.totalCopies) : 1,
      };
      await axios.post('/api/library/resources', toFormData(payload, resourceFile, coverFile), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({ type: 'success', text: 'Library resource created successfully.' });
      setFormOpen(false);
      resetForm();
      await loadLibrary();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to create library resource.' });
    } finally {
      setSaving(false);
    }
  };

  const downloadResource = async (resourceId, fileName) => {
    try {
      const response = await axios.get(`/api/library/resources/${resourceId}/file`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([response.data]));
      const tab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!tab) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || `resource_${resourceId}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to open resource file.' });
    }
  };

  const borrowResource = async (resourceId) => {
    try {
      await axios.post(`/api/library/resources/${resourceId}/borrow`, { dueDays: 14 });
      setMessage({ type: 'success', text: 'Resource borrowed successfully.' });
      await loadLibrary();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to borrow resource.' });
    }
  };

  const returnResource = async (resourceId) => {
    try {
      await axios.post(`/api/library/resources/${resourceId}/return`);
      setMessage({ type: 'success', text: 'Resource returned successfully.' });
      await loadLibrary();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to return resource.' });
    }
  };

  const toggleFavorite = async (resource) => {
    try {
      if (resource.favoritedByMe) {
        await axios.delete(`/api/library/resources/${resource.id}/favorite`);
      } else {
        await axios.post(`/api/library/resources/${resource.id}/favorite`);
      }
      await loadLibrary();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to update favorite.' });
    }
  };

  const addReview = async (resource) => {
    const rating = window.prompt('Rate this resource from 1 to 5:', '5');
    if (!rating) return;
    const ratingNumber = Number(rating);
    if (Number.isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      setMessage({ type: 'error', text: 'Rating must be between 1 and 5.' });
      return;
    }
    const comment = window.prompt('Optional comment:', '');
    try {
      await axios.post(`/api/library/resources/${resource.id}/review`, {
        rating: ratingNumber,
        comment: comment || '',
      });
      setMessage({ type: 'success', text: 'Review submitted successfully.' });
      await loadLibrary();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to submit review.' });
    }
  };

  const removeResource = async (resource) => {
    const ok = window.confirm(`Delete "${resource.title}" from the digital library?`);
    if (!ok) return;
    try {
      await axios.delete(`/api/library/resources/${resource.id}`);
      setMessage({ type: 'success', text: 'Resource deleted successfully.' });
      await loadLibrary();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data || 'Failed to delete resource.' });
    }
  };

  const resourceTypes = useMemo(
    () => ['ALL', 'BOOK', 'DOCUMENT', 'JOURNAL', 'ARTICLE', 'AUDIO', 'VIDEO'],
    [],
  );

  return (
    <div className="users-page ctx-page-with-chat">
      <section className="users-hero panel-card">
        <div className="users-hero-copy">
          <h1>Digital Library</h1>
          <p>Discover, borrow, rate, and manage high-quality learning resources.</p>
          <div className="users-hero-tags">
            <span className="users-hero-chip">Role: {role.replaceAll('_', ' ')}</span>
            <span className="users-hero-chip">Resources: {dashboard?.totalResources ?? resources.length}</span>
            <span className="users-hero-chip is-accent">Available: {dashboard?.availableResources ?? 0}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={() => setFormOpen((prev) => !prev)}>
              <Plus size={16} />
              {formOpen ? 'Close Form' : 'Add Resource'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={loadLibrary} disabled={loading}>
            <RefreshCcw size={16} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="users-stats-grid">
        <article className="users-stat-card panel-card is-info"><p>Total Resources</p><h3>{dashboard?.totalResources ?? 0}</h3></article>
        <article className="users-stat-card panel-card is-success"><p>My Borrows</p><h3>{dashboard?.myBorrows ?? 0}</h3></article>
        <article className="users-stat-card panel-card is-warning"><p>My Favorites</p><h3>{dashboard?.myFavorites ?? 0}</h3></article>
        <article className="users-stat-card panel-card is-neutral"><p>Active Borrows</p><h3>{dashboard?.activeBorrows ?? 0}</h3></article>
      </section>

      {message.text && (
        <div className={`status-message ${message.type === 'error' ? 'status-error' : 'status-success'}`}>
          {message.text}
        </div>
      )}

      {formOpen && canManage && (
        <section className="panel-card users-form-card">
          <h2>New Library Resource</h2>
          <form className="user-create-form" onSubmit={handleCreateResource}>
            <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <input className="input" placeholder="Author" value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} required />
            <input className="input" placeholder="Publisher" value={form.publisher} onChange={(e) => setForm((p) => ({ ...p, publisher: e.target.value }))} />
            <input className="input" placeholder="ISBN" value={form.isbn} onChange={(e) => setForm((p) => ({ ...p, isbn: e.target.value }))} />
            <textarea className="input" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '0.5rem' }}>
              <select className="input" value={form.resourceType} onChange={(e) => setForm((p) => ({ ...p, resourceType: e.target.value }))}>
                {resourceTypes.filter((t) => t !== 'ALL').map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input" placeholder="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
              <input className="input" placeholder="Subject (e.g. Mathematics)" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
              <input className="input" placeholder="Grade (e.g. Grade 9)" value={form.gradeLevel} onChange={(e) => setForm((p) => ({ ...p, gradeLevel: e.target.value }))} />
              <input className="input" placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
              <input className="input" placeholder="Language" value={form.language} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))} />
              <input className="input" type="number" placeholder="Year" value={form.publicationYear} onChange={(e) => setForm((p) => ({ ...p, publicationYear: e.target.value }))} />
              <input className="input" type="number" placeholder="Pages" value={form.pages} onChange={(e) => setForm((p) => ({ ...p, pages: e.target.value }))} />
              <select className="input" value={form.accessType} onChange={(e) => setForm((p) => ({ ...p, accessType: e.target.value }))}>
                <option value="DOWNLOAD_ONLY">Download Only</option>
                <option value="EXTERNAL_LINK_ONLY">External Link Only</option>
                <option value="DOWNLOAD_AND_LINK">Download + External Link</option>
              </select>
              <input className="input" placeholder="External URL (optional)" value={form.externalUrl} onChange={(e) => setForm((p) => ({ ...p, externalUrl: e.target.value }))} />
              <input className="input" type="number" min="1" placeholder="Copies" value={form.totalCopies} onChange={(e) => setForm((p) => ({ ...p, totalCopies: e.target.value }))} />
            </div>
            <label className="users-muted">Resource File</label>
            <input className="input" type="file" onChange={(e) => setResourceFile(e.target.files?.[0] || null)} />
            <label className="users-muted">Cover Image</label>
            <input className="input" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            <button className="btn btn-primary users-create-btn" disabled={saving}>
              <LibraryBig size={18} />
              {saving ? 'Saving...' : 'Publish Resource'}
            </button>
          </form>
        </section>
      )}

      <section className="panel-card users-list-card">
        <div className="users-list-head">
          <h2>Library Catalog</h2>
          <div className="users-list-tools">
            <div className="users-search-wrap">
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author, category, tags" />
            </div>
            <select className="input users-role-filter" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="ALL">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input users-role-filter" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="ALL">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input users-role-filter" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
              <option value="ALL">All grades</option>
              {gradeLevels.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="input users-role-filter" value={type} onChange={(e) => setType(e.target.value)}>
              {resourceTypes.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All types' : t}</option>)}
            </select>
            <select className="input users-role-filter" value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="ALL">All availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
            <select className="input users-role-filter" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Most Recent</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="year">Publication Year</option>
            </select>
            <button type="button" className="btn btn-secondary" onClick={applyFilters}>
              <Filter size={16} />
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <p className="users-muted">Loading library resources...</p>
        ) : resources.length === 0 ? (
          <p className="users-muted">No resources found. Adjust filters or add new resources.</p>
        ) : (
          <div className="users-grid">
            {resources.map((resource) => (
              <div key={resource.id} className="user-item">
                <div className="user-item-main">
                  <div className="user-item-head">
                    <div className="user-avatar"><BookOpen size={16} /></div>
                    <div>
                      <h3>{resource.title}</h3>
                      <p>{resource.author}</p>
                    </div>
                  </div>
                  <div className="user-item-meta">
                    <span className={`role-chip ${badgeClass(resource)}`}>
                      {resource.available ? `Available (${resource.availableCopies})` : 'Unavailable'}
                    </span>
                    <span className="role-chip is-other">{resource.resourceType}</span>
                    {resource.category && <span className="role-chip is-parent">{resource.category}</span>}
                    {resource.subject && <span className="role-chip is-teacher">{resource.subject}</span>}
                    {resource.gradeLevel && <span className="role-chip is-admin">{resource.gradeLevel}</span>}
                    <small>Rating: {Number(resource.averageRating || 0).toFixed(1)} ({resource.ratingsCount || 0})</small>
                    <small>Favorites: {resource.favoritesCount || 0}</small>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {resource.fileName && (
                    <button type="button" className="btn btn-secondary" onClick={() => downloadResource(resource.id, resource.fileName)}>
                      <Download size={14} />
                      Open
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={() => toggleFavorite(resource)}>
                    <Heart size={14} />
                    {resource.favoritedByMe ? 'Unfavorite' : 'Favorite'}
                  </button>
                  {!resource.borrowedByMe ? (
                    <button type="button" className="btn btn-primary" onClick={() => borrowResource(resource.id)} disabled={!resource.available}>
                      Borrow
                    </button>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={() => returnResource(resource.id)}>
                      <Undo2 size={14} />
                      Return
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={() => addReview(resource)}>
                    <Star size={14} />
                    Rate
                  </button>
                  {canManage && (
                    <button type="button" className="btn btn-danger" onClick={() => removeResource(resource)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel-card users-list-card">
        <h2>My Borrow Timeline</h2>
        {myBorrows.length === 0 ? (
          <p className="users-muted">No borrow activity yet.</p>
        ) : (
          <div className="users-grid">
            {myBorrows.map((borrow) => (
              <div key={borrow.id} className="user-item">
                <div className="user-item-main">
                  <h3>{borrow.resourceTitle}</h3>
                  <p>{borrow.resourceAuthor}</p>
                  <div className="user-item-meta">
                    <span className={`role-chip ${borrow.status === 'BORROWED' ? 'is-warning' : 'is-success'}`}>
                      {borrow.status}
                    </span>
                    <small>Borrowed: {new Date(borrow.borrowedAt).toLocaleDateString()}</small>
                    {borrow.dueDate && <small>Due: {new Date(borrow.dueDate).toLocaleDateString()}</small>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ContextChatWidget
        contextType="LIBRARY"
        contextKey="GLOBAL_LIBRARY"
        title="Library Community Chat"
        subtitle="Share recommendations, ask for resources, and help other learners."
      />
    </div>
  );
}
