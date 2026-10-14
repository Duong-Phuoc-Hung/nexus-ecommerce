export function NexusLogo({
  className = 'nexus-logo',
  href = '/',
}: {
  className?: string;
  href?: string;
}) {
  return (
    <a className={className} href={href} aria-label="Nexus - về trang chủ">
      <svg className="nexus-logo-mark" viewBox="0 0 48 48" role="img" aria-hidden="true">
        <path
          d="M10 17h28l-2.2 25H12.2L10 17Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinejoin="round"
        />
        <path
          d="M17 18v-3.5a7 7 0 0 1 14 0V18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
        <path d="M18 35V25h2.5l7 6.2V25H30v10h-2.4l-7.1-6.3V35H18Z" fill="currentColor" />
      </svg>
      <span className="nexus-logo-word">NEXUS</span>
    </a>
  );
}
