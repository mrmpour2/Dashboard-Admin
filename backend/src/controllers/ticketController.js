import * as ticketService from "../services/ticketService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listTickets = asyncHandler(async (req, res) => {
  res.json(await ticketService.listTickets(req.query));
});

export const getTicket = asyncHandler(async (req, res) => {
  res.json({ ticket: await ticketService.getTicketById(req.params.id) });
});

export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.createTicket(req.body);
  res.status(201).json({ ticket });
});

export const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateTicket(req.params.id, req.body);
  res.json({ ticket });
});

export const deleteTicket = asyncHandler(async (req, res) => {
  await ticketService.deleteTicket(req.params.id);
  res.status(204).send();
});

export const addComment = asyncHandler(async (req, res) => {
  const comment = await ticketService.addComment(
    req.params.id,
    req.user.id,
    req.body.content,
  );
  res.status(201).json({ comment });
});
