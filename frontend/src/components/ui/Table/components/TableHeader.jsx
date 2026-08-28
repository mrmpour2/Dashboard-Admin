function TableHeader({ children }) {
  return (
    <thead className="bg-SurfaceMuted border-b border-Border">
      <tr>{children}</tr>
    </thead>
  );
}

export default TableHeader;
