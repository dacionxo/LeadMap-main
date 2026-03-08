"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ErrorBoundary from "../../marketing/components/ErrorBoundary";
import ComposeEmailModal from "./ComposeEmailModal";
import ReplyComposer from "./ReplyComposer";
import ThreadList from "./ThreadList";
import ThreadView from "./ThreadView";
import UniboxSidebar from "./UniboxSidebar";

interface Thread {
  id: string;
  subject: string;
  mailbox: {
    id: string;
    email: string;
    display_name: string | null;
    provider: string;
  };
  status: string;
  unread: boolean;
  unreadCount: number;
  starred: boolean;
  archived: boolean;
  lastMessage: {
    direction: "inbound" | "outbound";
    snippet: string;
    received_at: string | null;
    read: boolean;
  } | null;
  lastMessageAt: string;
  contactId?: string | null;
  listingId?: string | null;
  campaignId?: string | null;
  messageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Mailbox {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  active: boolean;
}

type FilterStatus =
  | "all"
  | "open"
  | "needs_reply"
  | "waiting"
  | "closed"
  | "ignored";
type FilterFolder = "inbox" | "archived" | "starred" | "drafts" | "recycling_bin";

interface UniboxContentProps {
  /** When true, render only the three-pane layout (no Elite header/mesh). For use inside dashboard layout. */
  embedded?: boolean;
}

export default function UniboxContent({
  embedded = false,
}: UniboxContentProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [threadDetails, setThreadDetails] = useState<any>(null);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [folderFilter, setFolderFilter] = useState<FilterFolder>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<
    "reply" | "reply-all" | "forward" | null
  >(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [folderCounts, setFolderCounts] = useState<
    Partial<Record<FilterFolder, number>>
  >({});
  const [statusByFolder, setStatusByFolder] = useState<
    Record<string, Record<FilterStatus, number>>
  >({});
  const [mailboxCounts, setMailboxCounts] = useState<Record<string, number>>({});
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetchMailboxes();
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/unibox/counts", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setFolderCounts(data.folders || {});
        setStatusByFolder(data.statusByFolder || {});
        setMailboxCounts(data.mailboxCounts || {});
      }
    } catch (error) {
      console.error("[UniboxContent] Error fetching counts:", error);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Reset to page 1 and clear selection when filters or search change
  useEffect(() => {
    setPage(1);
    setSelectedThreadIds(new Set());
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery]);

  useEffect(() => {
    fetchThreads();
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery, page]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchThreads();
      fetchCounts();
      if (selectedThread) fetchThreadDetails(selectedThread.id);
    };
    window.addEventListener("unibox-refresh", handleRefresh);
    return () => window.removeEventListener("unibox-refresh", handleRefresh);
  }, [selectedThread, fetchCounts]);

  const fetchMailboxes = async () => {
    try {
      const response = await fetch("/api/mailboxes");
      if (response.ok) {
        const data = await response.json();
        setMailboxes(data.mailboxes || []);
      }
    } catch (error) {
      console.error("Error fetching mailboxes:", error);
    }
  };

  const fetchThreads = async () => {
    const isFirstPage = page === 1;
    try {
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);

      // Drafts view: load from email_drafts instead of unibox threads
      if (folderFilter === "drafts") {
        try {
          const response = await fetch(`/api/emails/drafts?limit=100`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            let drafts: any[] = data.drafts || [];

            // Client-side search over subject + preview text + from email
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              drafts = drafts.filter((d) => {
                const subject = (d.subject || "").toLowerCase();
                const preview = (d.preview_text || "").toLowerCase();
                const fromEmail = (d.from_email || "").toLowerCase();
                return (
                  subject.includes(q) ||
                  preview.includes(q) ||
                  fromEmail.includes(q)
                );
              });
            }

            const mapped: Thread[] = drafts.map((d: any) => {
              const fallbackDate = new Date().toISOString();
              const lastMessageAt = d.updated_at || d.created_at || fallbackDate;
              const rawHtml: string = d.html_content || "";
              const plainFromHtml = rawHtml
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              const snippetSource =
                d.preview_text || plainFromHtml || "(Empty draft)";
              const snippet =
                snippetSource.length > 220
                  ? `${snippetSource.slice(0, 217)}...`
                  : snippetSource;

              return {
                id: `draft-${d.id}`,
                subject: d.subject || "(Draft)",
                mailbox: {
                  id: d.mailbox_id || "draft",
                  email: d.from_email || "",
                  display_name: d.from_name || d.from_email || null,
                  provider: "draft",
                },
                status: "draft",
                unread: false,
                unreadCount: 0,
                starred: false,
                archived: false,
                lastMessage: {
                  direction: "outbound",
                  snippet,
                  received_at: lastMessageAt,
                  read: true,
                },
                lastMessageAt,
                contactId: null,
                listingId: null,
                campaignId: null,
                messageCount: 1,
                createdAt: d.created_at || null,
                updatedAt: d.updated_at || null,
              };
            });

            setFolderCounts((prev) => ({ ...prev, drafts: mapped.length }));
            setHasMore(false);

            if (isFirstPage) {
              setThreads(mapped);
              if (!selectedThread && mapped.length > 0) {
                handleThreadSelect(mapped[0]);
              }
            } else {
              setThreads(mapped);
            }
          }
        } finally {
          if (isFirstPage) setLoading(false);
          else setLoadingMore(false);
        }
        return;
      }

      const params = new URLSearchParams();
      if (selectedMailboxId) params.append("mailboxId", selectedMailboxId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      if (folderFilter === "recycling_bin") params.append("folder", "recycling_bin");
      else if (folderFilter === "archived") params.append("folder", "archived");
      else if (folderFilter === "starred") params.append("folder", "starred");
      else if (folderFilter === "inbox") params.append("folder", "inbox");
      params.append("page", page.toString());
      params.append("pageSize", "50");

      const response = await fetch(`/api/unibox/threads?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const newThreads = data.threads || [];
        const total = data.pagination?.total ?? 0;
        const totalPages = data.pagination?.totalPages ?? 1;
        // Folder counts come from GET /api/unibox/counts; don't overwrite here
        setHasMore(page < totalPages);
        if (isFirstPage) {
          setThreads(newThreads);
          if (!selectedThread && newThreads.length > 0) {
            handleThreadSelect(newThreads[0]);
          }
        } else {
          setThreads((prev) => {
            const seen = new Set(prev.map((t) => t.id));
            const appended = newThreads.filter((t: Thread) => !seen.has(t.id));
            return appended.length ? [...prev, ...appended] : prev;
          });
        }
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      if (isFirstPage) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const fetchThreadDetails = async (threadId: string) => {
    try {
      setLoadingThread(true);
      // Draft detail view uses email_drafts instead of unibox threads
      if (threadId.startsWith("draft-")) {
        const draftId = threadId.replace("draft-", "");
        const response = await fetch(`/api/emails/drafts/${draftId}`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const d = data.draft;
          if (d) {
            const fallbackDate = new Date().toISOString();
            const lastMessageAt =
              d.updated_at || d.created_at || fallbackDate;
            const rawHtml: string = d.html_content || "";
            const plainFromHtml = rawHtml
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            const snippetSource =
              d.preview_text || plainFromHtml || "(Empty draft)";
            const snippet =
              snippetSource.length > 220
                ? `${snippetSource.slice(0, 217)}...`
                : snippetSource;

            const toEmails: string[] = Array.isArray(d.to_emails)
              ? d.to_emails
              : [];

            const message = {
              id: `draft-msg-${d.id}`,
              direction: "outbound" as const,
              subject: d.subject || "(Draft)",
              snippet,
              body_html: d.html_content || "",
              body_plain: plainFromHtml,
              received_at: null,
              sent_at: lastMessageAt,
              read: true,
              email_participants: [
                {
                  type: "from" as const,
                  email: d.from_email || "",
                  name: d.from_name || null,
                },
                ...toEmails.map((email: string) => ({
                  type: "to" as const,
                  email,
                  name: null as string | null,
                })),
              ],
              email_attachments: [],
            };

            const threadDetail = {
              id: threadId,
              subject: d.subject || "(Draft)",
              status: "draft",
              unread: false,
              starred: false,
              archived: false,
              mailbox: {
                id: d.mailbox_id || "draft",
                email: d.from_email || "",
                display_name: d.from_name || d.from_email || null,
                provider: "draft",
              },
              messages: [message],
              lastMessageAt,
              contact: undefined,
              listing: undefined,
              campaign: undefined,
            };
            setThreadDetails(threadDetail);
          } else {
            setThreadDetails(null);
          }
        } else {
          setThreadDetails(null);
        }
      } else {
        const response = await fetch(`/api/unibox/threads/${threadId}`);
        if (response.ok) {
          const data = await response.json();
          const raw = data.thread;
          // Normalize to prevent crashes from malformed API response
          const thread: any = raw ? {
            ...raw,
            messages: Array.isArray(raw.messages) ? raw.messages.map((m: any) => ({
              ...m,
              email_participants: Array.isArray(m?.email_participants) ? m.email_participants : [],
              email_attachments: Array.isArray(m?.email_attachments) ? m.email_attachments : [],
            })) : [],
          } : null;
          setThreadDetails(thread);
        } else {
          setThreadDetails(null);
        }
      }
    } catch (error) {
      console.error("[UniboxContent] Error fetching thread details:", error);
      setThreadDetails(null);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleThreadSelect = useCallback((thread: Thread) => {
    try {
      setSelectedThread(thread);
      setThreadDetails(null); // Clear previous while loading
      fetchThreadDetails(thread.id);
    } catch (err) {
      console.error("[UniboxContent] handleThreadSelect error:", err);
      setThreadDetails(null);
    }
  }, []);

  const handleReply = () => {
    setComposerMode("reply");
    setShowComposer(true);
  };

  const handleReplyAll = () => {
    setComposerMode("reply-all");
    setShowComposer(true);
  };

  const handleForward = () => {
    setComposerMode("forward");
    setShowComposer(true);
  };

  const handleComposerClose = () => {
    setShowComposer(false);
    setComposerMode(null);
  };

  const handleMoveToTrash = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-")) return;

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trash: true }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to move to Recycling");
      }
      setThreads((t) => t.filter((x) => x.id !== target.id));
      setFolderCounts((prev) => ({
        ...prev,
        recycling_bin: (prev.recycling_bin ?? 0) + 1,
        inbox: Math.max(0, (prev.inbox ?? 0) - 1),
      }));
      if (selectedThread?.id === target.id) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
      fetchThreads();
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error moving to trash:", error);
      alert(error instanceof Error ? error.message : "Failed to move to Recycling. Please try again.");
    }
  };

  const handleArchiveThread = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-")) return;
    const shouldArchive = folderFilter !== "archived";

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: shouldArchive }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to update");
      }
      setThreads((t) => t.filter((x) => x.id !== target.id));
      setFolderCounts((prev) => ({
        ...prev,
        archived: Math.max(0, (prev.archived ?? 0) + (shouldArchive ? 1 : -1)),
        inbox: Math.max(0, (prev.inbox ?? 0) + (shouldArchive ? -1 : 1)),
        starred: shouldArchive && folderFilter === "starred" ? Math.max(0, (prev.starred ?? 0) - 1) : (prev.starred ?? 0),
      }));
      if (selectedThread?.id === target.id) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
      fetchThreads();
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error archiving:", error);
      alert(error instanceof Error ? error.message : "Failed to update. Please try again.");
    }
  };

  const handleStarThread = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-")) return;
    const currentStarred = threadDetails?.starred ?? target.starred ?? false;
    const newStarred = !currentStarred;

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ starred: newStarred }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to update");
      }
      setThreads((t) =>
        t.map((x) =>
          x.id === target.id ? { ...x, starred: newStarred } : x
        )
      );
      setFolderCounts((prev) => ({
        ...prev,
        starred: Math.max(0, (prev.starred ?? 0) + (newStarred ? 1 : -1)),
      }));
      if (threadDetails?.id === target.id) {
        setThreadDetails({ ...threadDetails, starred: newStarred });
      }
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error starring:", error);
      alert(error instanceof Error ? error.message : "Failed to update. Please try again.");
    }
  };

  const handleRestoreFromRecycling = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-") || folderFilter !== "recycling_bin") return;

    try {
      const response = await fetch(`/api/unibox/threads/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trash: false }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to restore");
      }
      setThreads((t) => t.filter((x) => x.id !== target.id));
      setFolderCounts((prev) => ({
        ...prev,
        recycling_bin: Math.max(0, (prev.recycling_bin ?? 0) - 1),
        inbox: (prev.inbox ?? 0) + 1,
      }));
      if (selectedThread?.id === target.id) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
      fetchThreads();
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error restoring from Recycling:", error);
      alert(error instanceof Error ? error.message : "Failed to restore. Please try again.");
    }
  };

  const handlePermanentDeleteThread = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || target.id.startsWith("draft-") || folderFilter !== "recycling_bin") return;
    const targetId = target.id;

    const prevThreads = threads;
    const prevSelected = selectedThread;
    const prevDetails = threadDetails;

    setThreads((t) => t.filter((x) => x.id !== targetId));
    setFolderCounts((prev) => ({
      ...prev,
      recycling_bin: Math.max(0, (prev.recycling_bin ?? 0) - 1),
    }));
    if (selectedThread?.id === targetId) {
      setSelectedThread(null);
      setThreadDetails(null);
    }

    try {
      const response = await fetch(`/api/unibox/threads/${targetId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to delete");
      }
      fetchThreads();
      fetchCounts();
    } catch (error) {
      console.error("[UniboxContent] Error permanently deleting thread:", error);
      setThreads(prevThreads);
      setFolderCounts((prev) => ({
        ...prev,
        recycling_bin: prevThreads.length,
      }));
      setSelectedThread(prevSelected);
      setThreadDetails(prevDetails);
      alert(error instanceof Error ? error.message : "Failed to delete. Please try again.");
    }
  };

  const handleDeleteDraft = async (threadOrNull?: Thread | null) => {
    const target = threadOrNull ?? selectedThread;
    if (!target || !target.id.startsWith("draft-")) return;
    const draftId = target.id.replace("draft-", "");
    const targetId = target.id;

    // Optimistic update: remove from UI instantly (like deals kanban)
    const prevThreads = threads;
    const prevSelected = selectedThread;
    const prevDetails = threadDetails;

    setThreads((t) => t.filter((x) => x.id !== targetId));
    setFolderCounts((prev) => ({
      ...prev,
      drafts: Math.max(0, (prev.drafts ?? 0) - 1),
    }));
    if (selectedThread?.id === targetId) {
      setSelectedThread(null);
      setThreadDetails(null);
    }

    try {
      const response = await fetch(`/api/emails/drafts/${draftId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to delete draft");
      }
      fetchThreads();
    } catch (error) {
      console.error("[UniboxContent] Error deleting draft:", error);
      setThreads(prevThreads);
      setFolderCounts((prev) => ({
        ...prev,
        drafts: prevThreads.length,
      }));
      setSelectedThread(prevSelected);
      setThreadDetails(prevDetails);
      alert(error instanceof Error ? error.message : "Failed to delete draft. Please try again.");
    }
  };

  const applyBulkAction = useCallback(
    async (action: "star" | "archive" | "trash") => {
      const ids = Array.from(selectedThreadIds).filter(
        (id) => !id.startsWith("draft-")
      );
      if (ids.length === 0) return;
      setBulkActionLoading(true);
      try {
        const body: Record<string, unknown> =
          action === "star"
            ? { starred: true }
            : action === "archive"
              ? { archived: true }
              : { trash: true };
        const responses = await Promise.all(
          ids.map((id) =>
            fetch(`/api/unibox/threads/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(body),
            })
          )
        );
        const failed = responses.filter((r) => !r.ok);
        if (failed.length > 0) {
          alert(
            `${ids.length - failed.length} updated. ${failed.length} failed. Please try again.`
          );
        }
        setSelectedThreadIds(new Set());
        fetchThreads();
        fetchCounts();
        if (selectedThread && ids.includes(selectedThread.id)) {
          fetchThreadDetails(selectedThread.id);
        }
      } catch (error) {
        console.error("[UniboxContent] Bulk action error:", error);
        alert(error instanceof Error ? error.message : "Bulk action failed. Please try again.");
      } finally {
        setBulkActionLoading(false);
      }
    },
    [selectedThreadIds, selectedThread]
  );

  const handleBulkStar = () => applyBulkAction("star");
  const handleBulkArchive = () => applyBulkAction("archive");
  const handleBulkTrash = () => applyBulkAction("trash");

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedThreadIds).filter(
      (id) => !id.startsWith("draft-")
    );
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/unibox/threads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ trash: false }),
          })
        )
      );
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) {
        alert(
          `${ids.length - failed.length} restored. ${failed.length} failed. Please try again.`
        );
      }
      setSelectedThreadIds(new Set());
      fetchThreads();
      fetchCounts();
      if (selectedThread && ids.includes(selectedThread.id)) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
    } catch (error) {
      console.error("[UniboxContent] Bulk restore error:", error);
      alert(error instanceof Error ? error.message : "Restore failed. Please try again.");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedThreadIds, selectedThread]);

  const handleBulkPermanentDelete = useCallback(async () => {
    const ids = Array.from(selectedThreadIds).filter(
      (id) => !id.startsWith("draft-")
    );
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    try {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/unibox/threads/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) {
        alert(
          `${ids.length - failed.length} deleted. ${failed.length} failed. Please try again.`
        );
      }
      setSelectedThreadIds(new Set());
      fetchThreads();
      fetchCounts();
      if (selectedThread && ids.includes(selectedThread.id)) {
        setSelectedThread(null);
        setThreadDetails(null);
      }
    } catch (error) {
      console.error("[UniboxContent] Bulk permanent delete error:", error);
      alert(error instanceof Error ? error.message : "Delete failed. Please try again.");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedThreadIds, selectedThread]);

  const handleComposerSend = async (data: any) => {
    if (!selectedThread) return;
    try {
      let endpoint = "";
      let body: any = {};
      if (composerMode === "reply" || composerMode === "reply-all") {
        endpoint = `/api/unibox/threads/${selectedThread.id}/reply`;
        body = {
          mailboxId: selectedThread.mailbox.id,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
          replyAll: composerMode === "reply-all",
          cc: data.cc || [],
          bcc: data.bcc || [],
        };
      } else if (composerMode === "forward") {
        endpoint = `/api/unibox/threads/${selectedThread.id}/forward`;
        body = {
          mailboxId: selectedThread.mailbox.id,
          to: data.to,
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
        };
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        handleComposerClose();
        if (selectedThread) {
          fetchThreadDetails(selectedThread.id);
          fetchThreads();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to send"}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to send"}`);
    }
  };

  const unreadCount = threads.filter((t) => t.unread).length;
  const mailboxUnreadCounts = mailboxes.reduce(
    (acc, mb) => {
      acc[mb.id] = threads.filter(
        (t) => t.mailbox.id === mb.id && t.unread
      ).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) setPage((p) => p + 1);
  }, [hasMore, loadingMore, loading]);

  const threePane = (
    <>
      <UniboxSidebar
        mailboxes={mailboxes}
        selectedMailboxId={selectedMailboxId}
        onMailboxSelect={setSelectedMailboxId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        folderFilter={folderFilter}
        onFolderFilterChange={setFolderFilter}
        mailboxUnreadCounts={mailboxUnreadCounts}
        unreadCount={unreadCount}
        folderCounts={folderCounts}
        statusCounts={
          folderFilter === "drafts" || folderFilter === "recycling_bin"
            ? (statusByFolder.inbox as Record<FilterStatus, number>) ?? {}
            : (statusByFolder[folderFilter] as Record<FilterStatus, number>) ?? {}
        }
        mailboxCounts={mailboxCounts}
        onCompose={() => setShowComposeModal(true)}
      />

      {/* Thread list column */}
      <section className="hidden md:flex md:flex-col w-[400px] flex-shrink-0 border-r border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-slate-900">
        {selectedThreadIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200/80 dark:border-gray-800/80 bg-unibox-primary/10 dark:bg-unibox-primary/20 shrink-0">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {selectedThreadIds.size} selected
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleBulkStar}
                disabled={bulkActionLoading}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                title="Star"
                aria-label="Star selected emails"
              >
                <span className="material-icons-round text-lg" aria-hidden>star_outline</span>
              </button>
              <button
                type="button"
                onClick={handleBulkArchive}
                disabled={bulkActionLoading}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                title="Archive"
                aria-label="Archive selected emails"
              >
                <span className="material-icons-round text-lg" aria-hidden>archive</span>
              </button>
              {folderFilter === "recycling_bin" && (
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  disabled={bulkActionLoading}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                  title="Restore to Inbox"
                  aria-label="Restore selected emails to Inbox"
                >
                  <span className="material-icons-round text-lg" aria-hidden>restore</span>
                </button>
              )}
              <button
                type="button"
                onClick={folderFilter === "recycling_bin" ? handleBulkPermanentDelete : handleBulkTrash}
                disabled={bulkActionLoading}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 disabled:opacity-50 transition-colors"
                title={folderFilter === "recycling_bin" ? "Delete permanently" : "Move to Recycling"}
                aria-label={folderFilter === "recycling_bin" ? "Delete selected emails permanently" : "Move selected emails to Recycling"}
              >
                <span className="material-icons-round text-lg" aria-hidden>delete_outline</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedThreadIds(new Set())}
              className="text-xs font-medium text-unibox-primary hover:underline shrink-0"
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>
        )}
        <div className="h-20 flex items-center px-6 border-b border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-slate-900">
          <div className="relative w-full">
            <span
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 material-icons-round text-xl pointer-events-none"
              aria-hidden
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-unibox-primary/50 focus:border-unibox-primary transition-all placeholder-slate-400 shadow-sm"
              aria-label="Search threads"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <ThreadList
            threads={threads}
            selectedThread={selectedThread}
            onThreadSelect={handleThreadSelect}
            loading={loading}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
            onDeleteDraft={folderFilter === "drafts" ? (t) => handleDeleteDraft(t) : undefined}
            onDeleteFromTrash={folderFilter === "recycling_bin" ? (t) => handlePermanentDeleteThread(t) : undefined}
            selectedIds={selectedThreadIds}
            onSelectionChange={setSelectedThreadIds}
          />
        </div>
      </section>

      {/* Thread view column */}
      <section className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 relative overflow-hidden min-w-0 border-l border-gray-100 dark:border-slate-800">
        <ErrorBoundary
          key={selectedThread?.id ?? "none"}
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500 dark:text-slate-400 p-6">
                <span className="material-icons-outlined text-6xl opacity-50 block mb-4" aria-hidden>error_outline</span>
                <p className="text-lg font-medium mb-2">Could not load email</p>
                <p className="text-sm mb-4">Try selecting another email or refresh the page.</p>
                <button
                  type="button"
                  onClick={() => { setSelectedThread(null); setThreadDetails(null); }}
                  className="px-4 py-2 bg-unibox-primary text-white rounded-lg hover:opacity-90 text-sm font-medium"
                >
                  Clear selection
                </button>
              </div>
            </div>
          }
        >
          {selectedThread ? (
            <ThreadView
              thread={threadDetails}
              loading={loadingThread}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onDeleteDraft={handleDeleteDraft}
              onMoveToTrash={folderFilter !== "drafts" && folderFilter !== "recycling_bin" ? handleMoveToTrash : undefined}
              onArchive={folderFilter !== "drafts" ? handleArchiveThread : undefined}
              onStar={folderFilter !== "drafts" ? handleStarThread : undefined}
              onRestore={folderFilter === "recycling_bin" ? handleRestoreFromRecycling : undefined}
              onPermanentDelete={folderFilter === "recycling_bin" ? handlePermanentDeleteThread : undefined}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <span
                  className="material-icons-outlined text-6xl opacity-50 block mb-4"
                  aria-hidden
                >
                  mail_outline
                </span>
                <p className="text-lg font-medium mb-2">No thread selected</p>
                <p className="text-sm">
                  Select a thread from the list to view conversation
                </p>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </section>
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="flex flex-1 min-h-0 overflow-hidden isolate min-w-0">{threePane}</div>
        {showComposer && selectedThread && threadDetails && (
          <ReplyComposer
            thread={threadDetails}
            mode={composerMode}
            onClose={handleComposerClose}
            onSend={handleComposerSend}
            mailbox={selectedThread.mailbox}
          />
        )}
        {showComposeModal && (
          <ComposeEmailModal
            onClose={() => setShowComposeModal(false)}
            onSent={() => {
              setShowComposeModal(false);
              fetchThreads();
              if (selectedThread) fetchThreadDetails(selectedThread.id);
            }}
            defaultMailboxId={selectedMailboxId}
          />
        )}
      </>
    );
  }

  return (
    <div className="unibox-page unibox-mesh min-h-screen text-slate-800 dark:text-slate-200 font-display p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden">
      {/* Elite header */}
      <header className="w-full max-w-[1760px] flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-unibox-primary text-white flex items-center justify-center">
            <span className="material-icons-round text-lg" aria-hidden>
              check_circle
            </span>
          </div>
          <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">
            NextDeal
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-full border border-white/40 dark:border-slate-700/40 backdrop-blur-sm">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Apps"
          >
            <span className="material-icons-round text-base" aria-hidden>
              grid_view
            </span>
            Apps
          </Link>
          <Link
            href="/dashboard/crm/calendar"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Calendar"
          >
            <span className="material-icons-round text-base" aria-hidden>
              calendar_today
            </span>
            Calendar
          </Link>
          <Link
            href="/dashboard/email/campaigns"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Campaigns"
          >
            <span className="material-icons-round text-base" aria-hidden>
              campaign
            </span>
            Campaigns
          </Link>
          <span
            className="px-4 py-2 text-sm font-bold text-unibox-primary bg-white dark:bg-slate-700 shadow-sm rounded-full transition-all flex items-center gap-2"
            aria-current="page"
          >
            <span className="material-icons-round text-base" aria-hidden>
              inbox
            </span>
            Unibox
          </span>
        </nav>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 flex items-center justify-center font-bold text-xs"
            aria-hidden
          >
            T
          </div>
        </div>
      </header>

      {/* Main glass panel */}
      <main className="w-full max-w-[1760px] h-[85vh] unibox-glass-panel rounded-3xl shadow-unibox-glass flex overflow-hidden relative">
        {threePane}
      </main>

      {showComposer && selectedThread && threadDetails && (
        <ReplyComposer
          thread={threadDetails}
          mode={composerMode}
          onClose={handleComposerClose}
          onSend={handleComposerSend}
          mailbox={selectedThread.mailbox}
        />
      )}
      {showComposeModal && (
        <ComposeEmailModal
          onClose={() => setShowComposeModal(false)}
          onSent={() => {
            setShowComposeModal(false);
            fetchThreads();
            if (selectedThread) fetchThreadDetails(selectedThread.id);
          }}
          defaultMailboxId={selectedMailboxId}
        />
      )}
    </div>
  );
}
