import type { BoardDTO, BoardSummaryDTO, CardDTO, ColumnDTO } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the generic message.
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  listBoards: () => request<BoardSummaryDTO[]>("/api/boards"),
  createBoard: (title: string) => request<BoardSummaryDTO>("/api/boards", send("POST", { title })),
  getBoard: (boardId: string) => request<BoardDTO>(`/api/boards/${boardId}`),
  renameBoard: (boardId: string, title: string) =>
    request<void>(`/api/boards/${boardId}`, send("PATCH", { title })),
  deleteBoard: (boardId: string) => request<void>(`/api/boards/${boardId}`, send("DELETE")),

  createColumn: (boardId: string, title: string) =>
    request<ColumnDTO>(`/api/boards/${boardId}/columns`, send("POST", { title })),
  renameColumn: (columnId: string, title: string) =>
    request<void>(`/api/columns/${columnId}`, send("PATCH", { title })),
  deleteColumn: (columnId: string) => request<void>(`/api/columns/${columnId}`, send("DELETE")),

  createCard: (columnId: string, title: string) =>
    request<CardDTO>(`/api/columns/${columnId}/cards`, send("POST", { title })),
  updateCard: (cardId: string, data: { title?: string; description?: string }) =>
    request<CardDTO>(`/api/cards/${cardId}`, send("PATCH", data)),
  deleteCard: (cardId: string) => request<void>(`/api/cards/${cardId}`, send("DELETE")),
  moveCard: (cardId: string, columnId: string, index: number) =>
    request<CardDTO>(`/api/cards/${cardId}/move`, send("POST", { columnId, index })),
  addBlocker: (cardId: string, blockerId: string) =>
    request<CardDTO>(`/api/cards/${cardId}/blockers`, send("POST", { blockerId })),
  removeBlocker: (cardId: string, blockerId: string) =>
    request<CardDTO>(`/api/cards/${cardId}/blockers/${blockerId}`, send("DELETE")),
};
