export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-red-600 mb-4">403 Unauthorized</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          You do not have permission to view this internal document.
        </p>
      </div>
    </div>
  );
}
