// Returns false (and sends 405) when the request method isn't the allowed one.
export function allowMethod(req, res, method) {
  if (req.method === method) {
    return true;
  }

  res.setHeader("Allow", method);
  res.status(405).end("Method Not Allowed");
  return false;
}
