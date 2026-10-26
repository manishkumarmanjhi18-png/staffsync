import { useEffect, useState } from 'react';
import { api } from './api.js';

const TABS = {
  hr: ['Announcements', 'Employees', 'Leaves', 'Attendance', 'Training', 'Profile'],
  manager: ['Announcements', 'Employees', 'Leaves', 'Training', 'Attendance', 'Profile'],
  employee: ['Announcements', 'Leaves', 'Attendance', 'Training', 'Profile'],
};
const fmt = (d) => new Date(d).toLocaleDateString();

function useList(path) {
  const [list, setList] = useState([]);
  const load = () => api(path).then(setList).catch(() => {});
  useEffect(() => { load(); }, [path]);
  return [list, load];
}

// Small reusable form: fields = [[name, label, type, options]]
function Form({ fields, button, onSubmit, initial = {} }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await onSubmit(v); if (!Object.keys(initial).length) setV({}); }
    catch (x) { setErr(x.message); }
  };
  const set = (name) => (e) => setV({ ...v, [name]: e.target.value });
  return (
    <form className="form" onSubmit={submit}>
      {fields.map(([name, label, type = 'text', opts]) => (
        <label key={name}>{label}
          {type === 'textarea' ? <textarea value={v[name] || ''} onChange={set(name)} />
            : type === 'select' ? <select value={v[name] || opts[0]} onChange={set(name)}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
            : <input type={type} value={v[name] || ''} onChange={set(name)} required={['email', 'name', 'title', 'date', 'from', 'to', 'password'].includes(name) && !initial.name} />}
        </label>
      ))}
      {err && <p className="error">{err}</p>}
      <button className="btn">{button}</button>
    </form>
  );
}

function Login({ onLogin }) {
  const go = async (v) => {
    const d = await api('/login', 'POST', v);
    localStorage.setItem('token', d.token);
    localStorage.setItem('user', JSON.stringify(d.user));
    onLogin(d.user);
  };
  return (
    <div className="login">
      <div className="login-card">
        <h1>StaffSync</h1>
        <p className="muted">Sign in to manage leave, attendance and team updates.</p>
        <Form fields={[['email', 'Email', 'email'], ['password', 'Password', 'password']]} button="Sign in" onSubmit={go} />
        <p className="muted small">Demo: hr@, manager@ or employee@staffsync.com, password: password123</p>
      </div>
    </div>
  );
}

function Announcements({ user }) {
  const [list, load] = useList('/announcements');
  return (<>
    {user.role === 'hr' && <div className="panel"><h3>Post an announcement</h3>
      <Form fields={[['title', 'Title'], ['body', 'Message', 'textarea']]} button="Publish" onSubmit={async (v) => { await api('/announcements', 'POST', v); load(); }} /></div>}
    {list.length === 0 && <p className="muted">No announcements yet.</p>}
    {list.map((a) => (
      <div className="panel" key={a._id}>
        <h3>{a.title}</h3><p>{a.body}</p>
        <p className="muted small">{a.author?.name} on {fmt(a.createdAt)}</p>
        {user.role === 'hr' && <button className="link danger" onClick={async () => { await api('/announcements/' + a._id, 'DELETE'); load(); }}>Delete</button>}
      </div>))}
  </>);
}

function Employees({ user }) {
  const [list, load] = useList('/employees');
  return (<>
    {user.role === 'hr' && <div className="panel"><h3>Add an employee</h3>
      <Form button="Add employee" onSubmit={async (v) => { await api('/employees', 'POST', v); load(); }}
        fields={[['name', 'Name'], ['email', 'Email', 'email'], ['password', 'Password (default welcome123)', 'password'], ['role', 'Role', 'select', ['employee', 'manager', 'hr']], ['department', 'Department'], ['position', 'Position'], ['phone', 'Phone']]} /></div>}
    <div className="panel scroll"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Position</th><th>Phone</th>{user.role === 'hr' && <th></th>}</tr></thead>
      <tbody>{list.map((e) => (
        <tr key={e._id}><td>{e.name}</td><td>{e.email}</td><td>{e.role}</td><td>{e.department}</td><td>{e.position}</td><td>{e.phone}</td>
          {user.role === 'hr' && <td><button className="link danger" onClick={async () => { if (confirm('Remove ' + e.name + '?')) { await api('/employees/' + e._id, 'DELETE'); load(); } }}>Remove</button></td>}</tr>))}</tbody>
    </table></div>
  </>);
}

function Leaves({ user }) {
  const [list, load] = useList('/leaves');
  const decide = async (id, status) => { await api('/leaves/' + id, 'PUT', { status }); load(); };
  const canDecide = user.role !== 'employee';
  return (<>
    <div className="panel"><h3>Apply for leave</h3>
      <Form fields={[['from', 'From', 'date'], ['to', 'To', 'date'], ['reason', 'Reason', 'textarea']]} button="Submit request" onSubmit={async (v) => { await api('/leaves', 'POST', v); load(); }} /></div>
    <div className="panel scroll"><table>
      <thead><tr><th>Employee</th><th>From</th><th>To</th><th>Reason</th><th>Status</th>{canDecide && <th></th>}</tr></thead>
      <tbody>{list.map((l) => (
        <tr key={l._id}><td>{l.user?.name}</td><td>{l.from}</td><td>{l.to}</td><td>{l.reason}</td>
          <td><span className={'tag ' + l.status}>{l.status}</span></td>
          {canDecide && <td>{l.status === 'Pending' && l.user?._id !== user._id && <>
            <button className="link" onClick={() => decide(l._id, 'Approved')}>Approve</button>{' '}
            <button className="link danger" onClick={() => decide(l._id, 'Rejected')}>Reject</button></>}</td>}</tr>))}</tbody>
    </table>{list.length === 0 && <p className="muted">No leave requests.</p>}</div>
  </>);
}

function Attendance({ user }) {
  const [list, load] = useList('/attendance');
  const [msg, setMsg] = useState('');
  const mark = async () => { try { await api('/attendance', 'POST'); setMsg('Attendance marked for today.'); load(); } catch (e) { setMsg(e.message); } };
  return (<>
    <div className="panel"><h3>Today</h3><button className="btn" onClick={mark}>Mark me present</button>{msg && <p className="muted">{msg}</p>}</div>
    <div className="panel scroll"><table>
      <thead><tr>{user.role === 'hr' && <th>Employee</th>}<th>Date</th><th>Status</th></tr></thead>
      <tbody>{list.map((a) => <tr key={a._id}>{user.role === 'hr' && <td>{a.user?.name}</td>}<td>{a.date}</td><td><span className="tag Approved">{a.status}</span></td></tr>)}</tbody>
    </table>{list.length === 0 && <p className="muted">No attendance records yet.</p>}</div>
  </>);
}

function Training({ user }) {
  const [list, load] = useList('/training');
  return (<>
    {user.role === 'manager' && <div className="panel"><h3>Create a training program</h3>
      <Form fields={[['title', 'Title'], ['date', 'Date', 'date'], ['description', 'Description', 'textarea']]} button="Create program" onSubmit={async (v) => { await api('/training', 'POST', v); load(); }} /></div>}
    {list.length === 0 && <p className="muted">No training programs scheduled.</p>}
    {list.map((t) => (
      <div className="panel" key={t._id}>
        <h3>{t.title}</h3><p>{t.description}</p>
        <p className="muted small">{t.date}, by {t.createdBy?.name}</p>
        {user.role === 'manager' && <button className="link danger" onClick={async () => { await api('/training/' + t._id, 'DELETE'); load(); }}>Delete</button>}
      </div>))}
  </>);
}

function Profile({ user, setUser }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="panel"><h3>My details</h3>
      <p className="muted">{user.email}, {user.role}</p>
      <Form initial={user} button="Save changes" fields={[['name', 'Name'], ['phone', 'Phone'], ['department', 'Department'], ['position', 'Position']]}
        onSubmit={async (v) => { const u = await api('/me', 'PUT', v); localStorage.setItem('user', JSON.stringify(u)); setUser(u); setSaved(true); }} />
      {saved && <p className="muted">Saved.</p>}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [tab, setTab] = useState('Announcements');
  if (!user) return <Login onLogin={(u) => { setUser(u); setTab('Announcements'); }} />;
  const pages = { Announcements, Employees, Leaves, Attendance, Training, Profile };
  const Page = pages[tab];
  const logout = () => { localStorage.clear(); setUser(null); };
  return (
    <div className="app">
      <aside>
        <h2>StaffSync</h2>
        <nav>{TABS[user.role].map((t) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</nav>
        <div className="who"><strong>{user.name}</strong><span>{user.role}</span><button className="link" onClick={logout}>Log out</button></div>
      </aside>
      <main><h1>{tab}</h1><Page user={user} setUser={setUser} /></main>
    </div>
  );
}
