export default function Toast({ message, type = "success" }) {
  if (!message) return null;

  const bg =
    type === "error"
      ? "bg-red-500"
      : type === "success"
      ? "bg-green-500"
      : "bg-gray-700";

  return (
    <div className={`fixed right-5 top-5 z-50 rounded-lg px-4 py-3 text-white shadow-lg ${bg} animate-slide`}>
      {message}
    </div>
  );
}