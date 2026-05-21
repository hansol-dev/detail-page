"use client";

import { useMemo, useState } from "react";
import { ALL_CATEGORY_VALUE, PRODUCT_CATEGORIES } from "@/lib/product-categories";
import type { Notice } from "@/lib/types";

type NoticeRow = {
  id: string;
  notice?: Notice;
};

function createRow(index: number, notice?: Notice): NoticeRow {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    notice
  };
}

function hasNoticeContent(row: NoticeRow) {
  return Boolean(row.notice?.title?.trim() || row.notice?.content?.trim());
}

export function DynamicNoticeFields({
  initialNotices = [],
  disabled = false,
  includeCategories = false
}: {
  initialNotices?: Notice[];
  disabled?: boolean;
  includeCategories?: boolean;
}) {
  const initialRows = useMemo(() => {
    const source = initialNotices.length ? initialNotices : [undefined];
    return source.map((notice, index) => createRow(index, notice));
  }, [initialNotices]);
  const [rows, setRows] = useState<NoticeRow[]>(initialRows);
  const [pendingDelete, setPendingDelete] = useState<NoticeRow | null>(null);

  function addRow() {
    setRows((current) => [...current, createRow(current.length)]);
  }

  function removeRow(row: NoticeRow) {
    setRows((current) => {
      const next = current.filter((item) => item.id !== row.id);
      return next.length ? next : [createRow(0)];
    });
  }

  function updateRowText(rowId: string, key: "title" | "content", value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              notice: {
                title: row.notice?.title ?? "",
                content: row.notice?.content ?? "",
                categories: row.notice?.categories,
                [key]: value
              }
            }
          : row
      )
    );
  }

  function requestRemove(row: NoticeRow) {
    if (hasNoticeContent(row)) {
      setPendingDelete(row);
      return;
    }
    removeRow(row);
  }

  return (
    <div className="noticeFields">
      <div className="panelHeader">
        <h3>선택 안내사항</h3>
        <button type="button" onClick={addRow} disabled={disabled}>
          + 안내사항 추가
        </button>
      </div>
      <div className="noticeFieldList">
        {rows.map((row, index) => {
          const n = index + 1;
          const notice = row.notice;
          const categories = notice?.categories ?? [];
          return (
            <div className="noticeFieldPair" key={row.id}>
              <div className="noticeFieldHeader">
                <strong>안내사항 {n}</strong>
                <button type="button" onClick={() => requestRemove(row)} disabled={disabled || rows.length <= 1}>
                  삭제
                </button>
              </div>
              <label>
                <span className="labelLine">
                  <span>안내 제목 {n}</span>
                  <span className="badge optional">선택</span>
                </span>
                <textarea
                  className="noticeTitleTextarea"
                  name={`noticeTitle${n}`}
                  defaultValue={notice?.title ?? ""}
                  onChange={(event) => updateRowText(row.id, "title", event.currentTarget.value)}
                  disabled={disabled}
                  rows={1}
                />
              </label>
              <label>
                <span className="labelLine">
                  <span>안내 내용 {n}</span>
                  <span className="badge optional">선택</span>
                </span>
                <textarea
                  name={`noticeContent${n}`}
                  defaultValue={notice?.content ?? ""}
                  onChange={(event) => updateRowText(row.id, "content", event.currentTarget.value)}
                  disabled={disabled}
                  rows={3}
                />
              </label>
              {includeCategories ? (
                <fieldset className="noticeCategoryField">
                  <legend>적용 카테고리</legend>
                  <label>
                    <input
                      name={`noticeCategories${n}`}
                      type="checkbox"
                      value={ALL_CATEGORY_VALUE}
                      defaultChecked={!categories.length}
                      disabled={disabled}
                    />
                    <span>전체</span>
                  </label>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <label key={category}>
                      <input
                        name={`noticeCategories${n}`}
                        type="checkbox"
                        value={category}
                        defaultChecked={categories.includes(category)}
                        disabled={disabled}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </div>
          );
        })}
      </div>

      {pendingDelete ? (
        <div className="feedbackOverlay noticeDeleteOverlay" role="dialog" aria-modal="true">
          <div className="feedbackDialog">
            <div className="feedbackIcon" aria-hidden="true">
              ?
            </div>
            <div>
              <h2>안내사항 삭제</h2>
              <p>작성된 내용이 있습니다. 이 안내사항을 삭제할까요?</p>
              <small>삭제하면 이 입력 묶음의 제목, 내용, 카테고리 선택이 함께 사라집니다.</small>
            </div>
            <div className="feedbackActions">
              <button type="button" onClick={() => setPendingDelete(null)}>
                취소
              </button>
              <button
                className="primary dangerButton"
                type="button"
                onClick={() => {
                  removeRow(pendingDelete);
                  setPendingDelete(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
