import TabsContent from "./components/TabsContent";
import TabsList from "./components/TabsList";
import TabsTrigger from "./components/TabsTrigger";
import TabsProvider from "./TabContext/TabsProvider";

function Tabs({ children }) {
  return <TabsProvider>{children}</TabsProvider>;
}
Tabs.Trigger = TabsTrigger;
Tabs.List = TabsList;
Tabs.Content = TabsContent;
export default Tabs;
