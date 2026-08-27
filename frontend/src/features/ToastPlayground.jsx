import { Accordion, Tabs, Button } from "../components/ui";
import useToast from "../components/ui/Toast/ToastContext/useToast";

function TestTabs() {
  const { toast } = useToast();

  return (
    <>
      <div className="flex flex-wrap gap-3 p-6">
        <Button onClick={() => toast.Success("محصول با موفقیت ذخیره شد")}>
          Success Toast
        </Button>

        <Button onClick={() => toast.Error("خطایی در ذخیره اطلاعات رخ داد")}>
          Error Toast
        </Button>

        <Button onClick={() => toast.Warning("موجودی محصول رو به اتمام است")}>
          Warning Toast
        </Button>

        <Button onClick={() => toast.Information("نسخه جدید برنامه منتشر شد")}>
          Info Toast
        </Button>
      </div>
      <Tabs>
        <Tabs.List>
          <Tabs.Trigger value="profile">پروفایل</Tabs.Trigger>
          <Tabs.Trigger value="users">کاربران</Tabs.Trigger>
          <Tabs.Trigger value="products">محصولات</Tabs.Trigger>
        </Tabs.List>

        <div className="inline">
          <Tabs.Content value="profile">
            <div>
              <h2 className="font-bold text-lg">پروفایل</h2>
              <p>اطلاعات پروفایل کاربر</p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="users">
            <div>
              <h2 className="font-bold text-lg">کاربران</h2>
              <p>لیست کاربران سیستم</p>
            </div>
          </Tabs.Content>

          <Tabs.Content value="products">
            <div>
              <h2 className="font-bold text-lg">محصولات</h2>
              <p>لیست محصولات فروشگاه</p>
            </div>
          </Tabs.Content>
        </div>
      </Tabs>

    </>
  );
}

export default TestTabs;
