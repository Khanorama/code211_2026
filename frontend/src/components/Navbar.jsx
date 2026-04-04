import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser';
import { getDisplayName, getProfileCompletion } from '../services/profileUtils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/workshop', label: 'Workshop' },
];

const Navbar = () => {
  const { user, profile, logout } = useUser();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const completion = getProfileCompletion(profile);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar__brand">
        <div className="navbar__logo">PF</div>
        <div>
          <p className="navbar__eyebrow">PathFinder</p>
          <h1 className="navbar__title">Opportunity Navigator</h1>
        </div>
      </div>

      <nav className="navbar__links" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="navbar__meta">
        <div className="navbar__profile">
          <div className="navbar__avatar">{initials}</div>
          <div>
            <p className="navbar__name">{displayName}</p>
            <p className="navbar__status">{completion}% profile ready</p>
          </div>
        </div>

        <button className="button button--ghost" type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
};

export default Navbar;
