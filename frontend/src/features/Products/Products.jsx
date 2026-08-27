import { Tooltip } from "../../components/ui";
function Products() {
  return (
    <Tooltip>
      <Tooltip.Container>
        <Tooltip.Trigger>Hover Me</Tooltip.Trigger>
        <Tooltip.Content>سلام، من یک Tooltip هستم.</Tooltip.Content>
      </Tooltip.Container>
    </Tooltip>
  );
}

export default Products;
