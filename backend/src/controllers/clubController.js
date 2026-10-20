import {
  CLUB_COOKIE_NAME,
  CLUB_COOKIE_OPTIONS,
  getClubDashboard,
  joinClub,
  listClubRewards,
  loginClub,
  redeemClubReward,
  toMemberView,
} from "../services/clubService.js";
import { signClubToken } from "../utils/tokens.js";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { setTimeout as delay } from "node:timers/promises";
import { env } from "../config/env.js";
import { verifyClubClaim, resendClubClaim } from "../services/clubOwnershipService.js";
import { BadRequestError } from "../utils/AppError.js";

function claimActor(req, res, create = false) {
  let actorId;
  try { actorId = jwt.verify(req.cookies?.club_claim_actor, env.JWT_ACCESS_SECRET, { audience: "club-claim", issuer: "elin-club-claim", algorithms: ["HS256"] }).sub; } catch { /* scoped guest identity */ }
  if (!actorId && create) {
    actorId = crypto.randomUUID();
    const token = jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: actorId, audience: "club-claim", issuer: "elin-club-claim", expiresIn: "1d" });
    res.cookie("club_claim_actor", token, { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", path: "/api/public/club", maxAge: 86400000 });
  }
  if (!actorId) throw new BadRequestError("درخواست عضویت را دوباره آغاز کنید.");
  return actorId;
}

/** پاسخ‌های حساب عضو هرگز نباید توسط مرورگر یا پراکسی کش شوند. */
function noStore(res) {
  res.set("Cache-Control", "no-store, private");
}

function startSession(res, member) {
  const token = signClubToken(member);
  res.cookie(CLUB_COOKIE_NAME, token, CLUB_COOKIE_OPTIONS);
  return toMemberView(member);
}

export async function join(req, res, next) {
  const began = Date.now();
  try {
    const claim = await joinClub({ ...req.body, actorId: claimActor(req, res, true), ip: req.ip });
    noStore(res);
    await delay(Math.max(0, 350 - (Date.now() - began)));
    return res.status(202).json({ claim });
  } catch (error) {
    await delay(Math.max(0, 350 - (Date.now() - began)));
    return next(error);
  }
}

export async function verifyClaim(req, res, next) {
  try {
    const member = await verifyClubClaim({ ...req.body, actorId: claimActor(req, res) });
    noStore(res);
    return res.json({ member: startSession(res, member) });
  } catch (error) { return next(error); }
}
export async function resendClaim(req, res, next) {
  try { noStore(res); res.json({ claim: await resendClubClaim({ ...req.body, actorId: claimActor(req, res), ip: req.ip }) }); }
  catch (error) { next(error); }
}

export async function login(req, res, next) {
  try {
    const member = await loginClub(req.body);
    noStore(res);
    return res.json({ member: startSession(res, member) });
  } catch (error) {
    return next(error);
  }
}

export function logout(_req, res) {
  noStore(res);
  const { maxAge, ...clearOptions } = CLUB_COOKIE_OPTIONS;
  void maxAge;
  res.clearCookie(CLUB_COOKIE_NAME, clearOptions);
  return res.status(204).end();
}

export async function me(req, res, next) {
  try {
    noStore(res);
    return res.json(await getClubDashboard(req.clubMember));
  } catch (error) {
    return next(error);
  }
}

export async function rewards(_req, res, next) {
  try {
    noStore(res);
    return res.json({ rewards: await listClubRewards() });
  } catch (error) {
    return next(error);
  }
}

export async function redeem(req, res, next) {
  try {
    const result = await redeemClubReward({
      memberId: req.clubMember.id,
      rewardId: req.params.rewardId,
      idempotencyKey: req.body.idempotencyKey,
    });
    noStore(res);
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    return next(error);
  }
}
