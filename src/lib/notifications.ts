const NOTIFICATIONS_KEY = "notifications_enabled";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") {
    localStorage.setItem(NOTIFICATIONS_KEY, Notification.permission);
    return Notification.permission;
  }
  const result = await Notification.requestPermission();
  localStorage.setItem(NOTIFICATIONS_KEY, result);
  return result;
}

export function sendDeploymentNotification(
  pipelineName: string,
  status: "success" | "failure",
): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const title =
    status === "success" ? "Deployment succeeded" : "Deployment failed";
  const body =
    status === "success"
      ? `${pipelineName} completed successfully`
      : `${pipelineName} failed`;

  new Notification(title, {
    body,
    icon: "/Githubdeploymentdashboard/icons/icon-192x192.png",
  });
}
