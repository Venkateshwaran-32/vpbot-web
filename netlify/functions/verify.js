const jsonHeaders = {
  "Content-Type": "application/json",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

function getBackendVerifyUrl() {
  const backendUrl = process.env.VPBOT_BACKEND_URL;
  if (!backendUrl) {
    return null;
  }
  return `${backendUrl.replace(/\/+$/, "")}/api/verify`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const verifyUrl = getBackendVerifyUrl();
  const token = process.env.VPBOT_BACKEND_TOKEN;

  if (!verifyUrl || !token) {
    return jsonResponse(500, {
      error:
        "VPbot backend is not configured. Set VPBOT_BACKEND_URL and VPBOT_BACKEND_TOKEN in Netlify.",
    });
  }

  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vpbot-token": token,
      },
      body: event.body || "{}",
    });

    const responseText = await response.text();

    return {
      statusCode: response.status,
      headers: jsonHeaders,
      body: responseText || "{}",
    };
  } catch (error) {
    return jsonResponse(502, {
      error: "Could not reach VPbot backend.",
      details: error.message || String(error),
    });
  }
};
