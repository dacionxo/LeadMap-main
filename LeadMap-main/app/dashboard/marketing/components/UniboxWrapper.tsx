"use client";

import { Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ReplyComposer from "../../unibox/components/ReplyComposer";
import ThreadList from "../../unibox/components/ThreadList";
import ThreadView from "../../unibox/components/ThreadView";
import UniboxSidebar from "../../unibox/components/UniboxSidebar";
import type {
  UniboxFilterFolder,
  UniboxFilterStatus,
  UniboxMailbox,
  UniboxThread,
} from "../../unibox/types";

/**
 * UniboxWrapper - Adapted version of UniboxContent for use within EmailMarketing tabs
 * Removes full-screen layout and adapts to tab context
 */
export default function UniboxWrapper() {
  const [threads, setThreads] = useState<UniboxThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<UniboxThread | null>(
    null
  );
  // Thread detail from API (with messages) – passed to ThreadView and ReplyComposer
  const [threadDetails, setThreadDetails] =
    useState<Parameters<typeof ThreadView>[0]["thread"]>(null);
  const [mailboxes, setMailboxes] = useState<UniboxMailbox[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<UniboxFilterStatus>("all");
  const [folderFilter, setFolderFilter] = useState<UniboxFilterFolder>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<
    "reply" | "reply-all" | "forward" | null
  >(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [folderCounts, setFolderCounts] = useState<
    Partial<Record<UniboxFilterFolder, number>>
  >({});

  // Fetch mailboxes
  useEffect(() => {
    fetchMailboxes();
  }, []);

  // Fetch threads
  useEffect(() => {
    fetchThreads();
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery, page]);

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
    try {
      setLoading(true);

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

            const mapped: UniboxThread[] = drafts.map((d: any) => {
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
                messageCount: 1,
                contactId: null,
                listingId: null,
                campaignId: null,
                createdAt: d.created_at || null,
                updatedAt: d.updated_at || null,
              };
            });

            setThreads(mapped);
            setHasMore(false);
            setFolderCounts((prev) => ({ ...prev, drafts: mapped.length }));

            // Auto-select first draft if none selected
            if (!selectedThread && mapped.length > 0) {
              handleThreadSelect(mapped[0]);
            }
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      const params = new URLSearchParams();
      if (selectedMailboxId) params.append("mailboxId", selectedMailboxId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      // Add folder filter support
      if (folderFilter === "archived") {
        params.append("folder", "archived");
      } else if (folderFilter === "starred") {
        params.append("folder", "starred");
      } else if (folderFilter === "inbox") {
        params.append("folder", "inbox");
      }

      params.append("page", page.toString());
      params.append("pageSize", "50");

      const response = await fetch(`/api/unibox/threads?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const total = data.pagination?.total ?? 0;
        setThreads(data.threads || []);
        setHasMore(data.pagination.page < data.pagination.totalPages);
        setFolderCounts((prev) => ({ ...prev, [folderFilter]: total }));

        // Auto-select first thread if none selected
        if (!selectedThread && data.threads && data.threads.length > 0) {
          handleThreadSelect(data.threads[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      setLoading(false);
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
          setThreadDetails(data.thread);
        }
      }
    } catch (error) {
      console.error("Error fetching thread details:", error);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleThreadSelect = useCallback((thread: UniboxThread) => {
    setSelectedThread(thread);
    fetchThreadDetails(thread.id);
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

  const handleDeleteDraft = async (thread?: UniboxThread | null) => {
    const target = thread ?? selectedThread;
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
      console.error("[UniboxWrapper] Error deleting draft:", error);
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

  // Get unread count
  const unreadCount = threads.filter((t) => t.unread).length;

  // Get mailbox for unread counts
  const mailboxUnreadCounts = mailboxes.reduce(
    (acc, mb) => {
      acc[mb.id] = threads.filter(
        (t) => t.mailbox.id === mb.id && t.unread
      ).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="h-[calc(100vh-250px)] flex flex-col bg-unibox-background-light dark:bg-unibox-background-dark -mx-6">
      {/* Main Content - Three Pane Layout (matches Elite CRM Unibox design) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <UniboxSidebar
          mailboxes={mailboxes}
          selectedMailboxId={selectedMailboxId}
          onMailboxSelect={setSelectedMailboxId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          folderFilter={folderFilter}
          onFolderFilterChange={(folder) => setFolderFilter(folder)}
          mailboxUnreadCounts={mailboxUnreadCounts}
          unreadCount={unreadCount}
          folderCounts={folderCounts}
        />

        {/* Middle - Thread List */}
        <section className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-200/50 dark:border-slate-700/50 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm hidden md:flex">
          <div className="h-20 flex items-center px-6 border-b border-slate-200/50 dark:border-slate-700/50">
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
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-unibox-primary/50 focus:border-unibox-primary transition-all placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ThreadList
              threads={threads}
              selectedThread={selectedThread}
              onThreadSelect={handleThreadSelect}
              loading={loading}
              onDeleteDraft={folderFilter === "drafts" ? handleDeleteDraft : undefined}
            />
          </div>
        </section>

        {/* Right - Thread View */}
        <section className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden min-w-0">
          {selectedThread ? (
            <ThreadView
              thread={threadDetails}
              loading={loadingThread}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onDeleteDraft={() => handleDeleteDraft()}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No thread selected</p>
                <p className="text-sm">
                  Select a thread from the list to view conversation
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Reply/Forward Composer */}
      {showComposer && selectedThread && threadDetails && (
        <ReplyComposer
          thread={threadDetails}
          mode={composerMode}
          onClose={handleComposerClose}
          onSend={handleComposerSend}
          mailbox={selectedThread.mailbox}
        />
      )}
    </div>
  );
}
