import clsx from "clsx";
import CardHeader from "./Components/CardHeader";
import CardBody from "./Components/CardBody";
import CardFooter from "./Components/CardFooter";

function Card({ children, className = "", loading = false, ...props }) {
  return (
    <div
      className={clsx(
        "relative bg-white font-Vazir text-center rounded-Card shadow-Card border border-gray-200",
        className,
      )}
      {...props}
    >
      {loading ? "درحال پردازش..." : children}
    </div>
  );
}
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
export default Card;
