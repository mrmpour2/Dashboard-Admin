import AccordionProvider from "./context/AccordionProvider";
import AccordionContent from "./components/AccordionContent";
import AccordionTrigger from "./components/AccordionTrigger";
import AccordionItem from "./components/AccordionItem";

function Accordion({ children }) {
  return <AccordionProvider>{children}</AccordionProvider>;
}
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;
export default Accordion;
