import { Table } from "../../components/ui";
import { users } from "../../data/users";

function Users() {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">لیست کاربران</h1>

      <Table variant="striped">
        <Table.Header>
          <Table.HeaderCell sortKey="id">شناسه</Table.HeaderCell>
          <Table.HeaderCell sortKey="name">نام</Table.HeaderCell>
          <Table.HeaderCell sortKey="email">ایمیل</Table.HeaderCell>
          <Table.HeaderCell sortKey="role">نقش</Table.HeaderCell>
          <Table.HeaderCell sortKey="status">وضعیت</Table.HeaderCell>
        </Table.Header>

        <Table.Body>
          {users.length === 0 ? (
            <Table.Empty colSpan={5} message="هیچ کاربری یافت نشد" />
          ) : (
            users.map((user) => (
              <Table.Row key={user.id} rowId={user.id}>
                <Table.Cell>{user.id}</Table.Cell>
                <Table.Cell>{user.name}</Table.Cell>
                <Table.Cell>{user.email}</Table.Cell>
                <Table.Cell>{user.role}</Table.Cell>
                <Table.Cell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.status === "فعال"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.status}
                  </span>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>
    </div>
  );
}

export default Users;
