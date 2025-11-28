// Environment detection utility
// QA tools should only be visible in qa branch

const QA_HOSTNAMES = ['localhost', '127.0.0.1', 'app-financiera-qa.web.app'];

export function isQAEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return QA_HOSTNAMES.includes(hostname) || process.env.NODE_ENV === 'development';
}

