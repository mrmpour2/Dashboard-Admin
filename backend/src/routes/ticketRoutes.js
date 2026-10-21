import { Router } from "express";
import * as ticketController from "../controllers/ticketController.js";
import { validate } from "../middleware/validate.js";
import {
  listTicketsSchema,
  ticketIdParamSchema,
  createTicketSchema,
  updateTicketSchema,
  createCommentSchema,
} from "../validators/ticketValidators.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listTicketsSchema), ticketController.listTickets);
router.get("/:id", validate(ticketIdParamSchema), ticketController.getTicket);
router.post("/", validate(createTicketSchema), ticketController.createTicket);
router.patch("/:id", validate(updateTicketSchema), ticketController.updateTicket);
router.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  validate(ticketIdParamSchema),
  ticketController.deleteTicket,
);
router.post(
  "/:id/comments",
  validate(createCommentSchema),
  ticketController.addComment,
);

export default router;
