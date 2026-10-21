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
  try {
    const member = await joinClub(req.body);
    noStore(res);
    return res.status(201).json({ member: startSession(res, member) });
  } catch (error) {
    return next(error);
  }
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
