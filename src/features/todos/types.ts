export type TodoId = string;
export type TodoListId = string;

export type Todo = {
id:TodoId;
listId: TodoListId;
parentId: TodoId | null;
title: string;
notes: string;
dueAt: string | null;
completedAt: string | null;
createdAt: string;
updatedAt: string;
position:number;
};

export type TodoById = Record<TodoId, Todo>;