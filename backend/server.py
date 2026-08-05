from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from parse import ParseError, parse_capture, parse_trace

app = FastAPI(title="LookMeNot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ParseError)
async def parse_error_handler(request: Request, exc: ParseError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/parse")
async def parse(request: Request):
    data = await request.json()
    entries = parse_trace(data)
    return entries


@app.post("/parse-capture")
async def parse_capture_endpoint(request: Request):
    data = await request.json()
    entries = parse_capture(data.get("input"), data.get("output"))
    return entries
