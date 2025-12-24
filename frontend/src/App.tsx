import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./layout/AdminLayout";
import { Dashboard } from "./pages/Dashboard";
import { PollCategoryMasterPage } from "./pages/PollCategoryMasterPage";
import { PollConfigMasterPage } from "./pages/PollConfigMasterPage";
import { CategoryFormPage } from "./pages/CategoryFormPage";
import { PollListPage } from "./pages/PollListPage";
import { PollFormPage } from "./pages/PollFormPage";
import { UserVerifyPage } from "./pages/UserVerifyPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { UserHomePage } from "./pages/UserHomePage";
import { UserFeedPage } from "./pages/UserFeedPage";
import { UserGroupsPage } from "./pages/UserGroupsPage";
import { UserPublicProfilesPage } from "./pages/UserPublicProfilesPage";
import { UserPublicProfileDetailPage } from "./pages/UserPublicProfileDetailPage";
import { ProfileAdminPage } from "./pages/ProfileAdminPage";
import { PollVotePage } from "./pages/PollVotePage";
import { UserPollCreatePage } from "./pages/UserPollCreatePage";
import { InviteLandingPage } from "./pages/InviteLandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFound } from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <AdminLayout
            title="Dashboard"
            subtitle="High-level overview for admins."
          >
            <Dashboard />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/profile-directory"
        element={
          <AdminLayout
            title="Profile Directory"
            subtitle="Manage public profiles and their categories."
          >
            <ProfileAdminPage />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/polls"
        element={
          <AdminLayout
            title="Poll Instances"
            subtitle="Create and manage individual poll runs from Poll Config blueprints."
          >
            <PollListPage />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/polls/new"
        element={
          <AdminLayout
            title="Create Poll"
            subtitle="Launch a new poll instance using an active Poll Config."
          >
            <PollFormPage mode="create" />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/polls/:id/edit"
        element={
          <AdminLayout
            title="Edit Poll"
            subtitle="Manage scheduling and metadata for an existing poll instance."
          >
            <PollFormPage mode="edit" />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/poll-configs/:id"
        element={
          <AdminLayout
            title="Poll Config Master"
            subtitle="Define poll DNA, templates, and rules with live preview."
          >
            <PollConfigMasterPage />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/poll-config"
        element={
          <AdminLayout
            title="Poll Config Master"
            subtitle="Define poll DNA, templates, and rules with live preview."
          >
            <PollConfigMasterPage />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <AdminLayout
            title="Poll Category Master"
            subtitle="Configure the taxonomy that powers your polls."
          >
            <PollCategoryMasterPage />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/categories/new"
        element={
          <AdminLayout
            title="Create Category"
            subtitle="Define a new category in the taxonomy hierarchy."
          >
            <CategoryFormPage mode="create" />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/categories/:id/edit"
        element={
          <AdminLayout
            title="Edit Category"
            subtitle="Modify the category configuration and inheritance behavior."
          >
            <CategoryFormPage mode="edit" />
          </AdminLayout>
        }
      />
      <Route path="/user/verify" element={<UserVerifyPage />} />
      <Route path="/user/profile" element={<UserProfilePage />} />
      <Route path="/user/home" element={<UserHomePage />} />
      <Route path="/user/groups" element={<UserGroupsPage />} />
      <Route path="/user/feed" element={<UserFeedPage />} />
      <Route path="/profiles" element={<UserPublicProfilesPage />} />
      <Route path="/profiles/:id" element={<UserPublicProfileDetailPage />} />
      <Route path="/polls/:id" element={<PollVotePage />} />
      <Route path="/polls/create" element={<UserPollCreatePage />} />
      <Route path="/invites/:token" element={<InviteLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
