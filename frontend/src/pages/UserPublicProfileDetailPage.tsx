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
  const followerDisplay = profile ? `${profile.followerCount.toLocaleString()} followers` : "";

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          {loading && <p className="text-xs text-muted-foreground">Loading profile…</p>}
          {error && !loading && <p className="text-xs text-destructive">{error}</p>}

          {!loading && !error && profile && (
            <div className="flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                      {profile.name}
                    </h1>
                    {profile.categoryName && (
                      <p className="text-[11px] text-muted-foreground">{profile.categoryName}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
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
                </div>

                <div className="text-right text-[11px] text-muted-foreground">
                  <div className="font-semibold text-foreground">
                    {followerDisplay}
                  </div>
                  <div>Followers</div>
                </div>
              </div>

              {/* Large actions like in reference: Vote + Follow */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 bg-blue-600 text-[13px] font-semibold hover:bg-blue-700"
                  size="lg"
                  onClick={() => {
                    // In future, this can deep-link to polls associated with this profile
                    navigate("/user/feed");
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

              {/* Claim info */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-[11px] text-muted-foreground max-w-[70%]">
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
          )}
        </section>
      </div>
    </UserLayout>
  );
}
