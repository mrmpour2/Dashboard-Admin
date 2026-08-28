function TableEmpty({ colSpan = 1, message = "No data to display" }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-textMuted">
        {message}
      </td>
    </tr>
  );
}

export default TableEmpty;
