import Link from "next/link";

/** Self-contained so it stays visible even if the Next error shell skips CSS. */
export function UnknownCharacter() {
  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "linear-gradient(180deg, #120c18 0%, #1a1224 45%, #0d0a12 100%)",
        color: "#f6ede0",
        fontFamily: "sans-serif",
      }}
    >
      <p style={{ fontSize: 28, margin: 0 }}>この夜には、その人はいない。</p>
      <p style={{ margin: 0, color: "rgba(246, 237, 224, 0.7)" }}>
        キャラクターが見つかりませんでした。
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          marginTop: 8,
          padding: "10px 16px",
          borderRadius: 10,
          background: "#e8c48a",
          color: "#2a1c10",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        一覧へ戻る
      </Link>
    </div>
  );
}
