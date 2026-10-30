import * as ticketService from "../services/ticketService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { ticketUploadsDirectory } from "../middleware/ticketUpload.js";

export const listTickets = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await ticketService.listTickets(req.query, req.user));
});

export const listAssignees = asyncHandler(async (_req, res) => {
  res.json({ items: await ticketService.listTicketAssignees() });
});

export const getTicket = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ticket: await ticketService.getTicketById(req.params.id, req.user) });
});

export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.createTicket(req.body);
  res.status(201).json({ ticket });
});

export const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateTicket(req.params.id, { ...req.body, actorId: req.user.id });
  res.json({ ticket });
});

export const getTicketAttachment = asyncHandler(async (req, res) => {
  const attachment = await ticketService.getTicketAttachment(req.params.id, req.user);
  const filename = path.basename(attachment.attachmentPath);
  const file = await readFile(path.join(ticketUploadsDirectory, filename));
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=\"ticket-attachment\"");
  res.send(file);
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
