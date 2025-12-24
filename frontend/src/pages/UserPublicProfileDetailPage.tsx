import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

import { UserLayout } from "../layout/UserLayout";
import {
  fetchPublicProfileDetail,
  followPublicProfile,
  unfollowPublicProfile,
  type PublicProfileDetail,
} from "../api/publicProfile.api";
import { Button } from "../components/ui/button";

export function UserPublicProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicProfileDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const p = await fetchPublicProfileDetail(id);
        setProfile(p);
      } catch (err) {
        console.error(err);
        const msg = (err as Error).message || "Failed to load profile";
        if (msg.startsWith("NOT_FOUND:")) {
          setError("Profile not found");
        } else if (msg.startsWith("AUTH_REQUIRED:")) {
          setError(msg.replace("AUTH_REQUIRED:", ""));
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const claimedLabel = profile?.isClaimed ? "CLAIMED" : "UNCLAIMED";
  const verifiedLabel = profile?.isVerified ? "VERIFIED" : "UNVERIFIED";
  const followerDisplay = profile ? profile.followerCount.toLocaleString() : "0";

  const handleToggleFollow = async () => {
    if (!id || !profile) return;
    try {
      setFollowLoading(true);
      let nextFollowerCount = profile.followerCount;
      if (profile.isFollowing) {
        const res = await unfollowPublicProfile(id);
        nextFollowerCount = res.followerCount;
      } else {
        const res = await followPublicProfile(id);
        nextFollowerCount = res.followerCount;
      }

      setProfile({
        ...profile,
        isFollowing: !profile.isFollowing,
        followerCount: nextFollowerCount,
      });
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message || "Failed to update follow state";
      if (msg.startsWith("AUTH_REQUIRED:")) {
        setError(msg.replace("AUTH_REQUIRED:", ""));
      } else if (msg.startsWith("NOT_FOUND:")) {
        setError("Profile not found");
      } else {
        setError(msg);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-0">
        {/* Hero header similar to FiMobile */}
        <section className="relative overflow-hidden rounded-b-3xl bg-gradient-to-b from-sky-200/70 via-slate-50 to-slate-50 pb-6 pt-6 shadow-sm">
          {loading && (
            <div className="mx-auto max-w-4xl px-4">
              <p className="text-xs text-muted-foreground">Loading profile…</p>
            </div>
          )}
          {error && !loading && (
            <div className="mx-auto max-w-4xl px-4">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {!loading && !error && profile && (
            <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4">

              {/* Cover image area + avatar */}
              <div className="relative mt-2 flex flex-col items-center">
                <div className="h-32 w-full rounded-2xl bg-cover bg-center" style={{
                  backgroundImage: "linear-gradient(90deg, #38bdf8, #0f172a)",
                }} />
                <div className="-mb-10 mt-[-48px] flex flex-col items-center">
                  <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-slate-50 bg-slate-100 shadow-md">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-emerald-500/10 text-emerald-700">
                        <Users className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Main content card area */}
        {!loading && !error && profile && (
          <section className="mx-auto -mt-6 w-full max-w-4xl space-y-4 px-4 pb-8">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4">
                {/* Name + meta */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                      {profile.name}
                    </h1>
                    {profile.categoryName && (
                      <p className="text-[12px] text-muted-foreground">{profile.categoryName}</p>
                    )}
                    {profile.about && (
                      <p className="max-w-2xl text-[12px] text-muted-foreground line-clamp-3">
                        {profile.about}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          profile.isClaimed
                            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/40"
                            : "bg-muted text-muted-foreground border border-muted-foreground/30"
                        }`}
                      >
                        {claimedLabel}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          profile.isVerified
                            ? "bg-blue-500/10 text-blue-700 border border-blue-500/40"
                            : "bg-muted text-muted-foreground border border-muted-foreground/30"
                        }`}
                      >
                        {verifiedLabel}
                      </span>
                    </div>
                  </div>

                  {/* Followers summary */}
                  <div className="shrink-0 rounded-xl bg-slate-50 px-4 py-3 text-right text-[11px] text-muted-foreground">
                    <div className="text-[10px] uppercase tracking-wide">Followers</div>
                    <div className="text-lg font-semibold text-foreground">
                      {followerDisplay}
                    </div>
                  </div>
                </div>

                {/* Big actions: Vote + Follow */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1 bg-blue-600 text-[13px] font-semibold hover:bg-blue-700"
                    size="lg"
                    onClick={() => {
                      if (id) {
                        navigate(`/user/trending/${id}/vote`);
                      }
                    }}
                  >
                    Vote
                  </Button>
                  <Button
                    className="flex-1 text-[13px] font-semibold"
                    size="lg"
                    variant={profile.isFollowing ? "outline" : "default"}
                    disabled={followLoading}
                    onClick={() => void handleToggleFollow()}
                  >
                    {followLoading
                      ? "Updating..."
                      : profile.isFollowing
                      ? "Unfollow"
                      : "Follow"}
                  </Button>
                </div>

                {/* Tabs strip (non-functional placeholders) */}
                <div className="mt-3 flex flex-wrap gap-1 border-t pt-3 text-[11px]">
                  {[
                    "Overview",
                    "About",
                    "Media",
                    "Social Accounts",
                    "Achievements",
                    "Announcements",
                  ].map((tab, index) => (
                    <button
                      key={tab}
                      type="button"
                      className={`rounded-full px-3 py-1 ${
                        index === 0
                          ? "bg-slate-900 text-slate-50"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Claim info */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <p className="max-w-[70%] text-[11px] text-muted-foreground">
                    To claim this profile, you must complete identity verification and submit the
                    details requested for this category. An admin will manually review and approve
                    one claim.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px]"
                      onClick={() => navigate(-1)}
                    >
                      Back
                    </Button>
                    <Button size="sm" className="text-[11px]" disabled>
                      Claim this profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </UserLayout>
  );
}
