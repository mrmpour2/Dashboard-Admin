import * as commentService from "../services/commentService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const listComments = asyncHandler(async (req,res)=>res.json(await commentService.listComments(req.query)));
