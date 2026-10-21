import { Link } from "react-router";
import { ShieldX } from "lucide-react";
import { Button, Card } from "../../components/ui";

function Forbidden() {
  return (
    <main className="grid min-h-screen place-items-center bg-Background p-6">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-Danger/10 text-Danger">
          <ShieldX aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-textPrimary">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-sm leading-6 text-textSecondary">نقش کاربری شما اجازه دسترسی به این بخش را ندارد.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="secondary">بازگشت به داشبورد</Button>
        </Link>
      </Card>
    </main>
  );
}
export default Forbidden;
