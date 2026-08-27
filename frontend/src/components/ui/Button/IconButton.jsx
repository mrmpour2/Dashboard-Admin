function IconButton({ icon, className = "", ...props }) {
  return (
    <span className={className} {...props}>
      {icon}
    </span>
  );
}

export default IconButton;
