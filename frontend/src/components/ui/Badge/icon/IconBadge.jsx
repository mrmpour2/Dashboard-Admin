function IconBadge({ icon, className = "", ...props }) {
  return (
    <span className={className} {...props}>
      {icon}
    </span>
  );
}

export default IconBadge;
