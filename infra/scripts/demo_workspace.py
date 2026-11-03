"""Manage the isolated nilart-demo Compose project without reading the live .env."""
import argparse
import os
import secrets
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV = ROOT / ".env.demo"
PROJECT = "nilart-demo"


def init():
    if ENV.exists():
        return
    values = {"POSTGRES_PASSWORD":secrets.token_hex(24),"REDIS_PASSWORD":secrets.token_hex(24),"RABBITMQ_PASSWORD":secrets.token_hex(24),"MINIO_ROOT_USER":"nilart-demo","MINIO_ROOT_PASSWORD":secrets.token_hex(24),"MINIO_BUCKET":"nilart-demo","HTTP_PORT":"18080","NILART_PUBLIC_ORIGIN":"http://127.0.0.1:18080","NILART_ENVIRONMENT":"development","NILART_PAYMENT_MODE":"zibal_sandbox","NILART_ZIBAL_MERCHANT_ID":"zibal","NILART_SMS_MODE":"sandbox","NILART_OTP_HMAC_KEY":secrets.token_hex(32),"NILART_DEMO_ADMIN_PASSWORD":secrets.token_urlsafe(24)}
    fd = os.open(ENV, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd,"w") as stream:
        stream.write("# Private isolated demo configuration. Never use for the live project.\n")
        stream.writelines(f"{key}={value}\n" for key,value in values.items())


def command(*args):
    if not ENV.exists():
        raise SystemExit("Initialize the demo workspace first.")
    # Ignore inherited Compose variables and live environment values.
    environ = {k:v for k,v in os.environ.items() if not k.startswith(("COMPOSE_","NILART_","POSTGRES_","REDIS_","RABBITMQ_","MINIO_")) and k!="HTTP_PORT"}
    return subprocess.run(["docker","compose","--project-name",PROJECT,"--env-file",str(ENV),"-f",str(ROOT/"infra/docker/compose.yaml"),"-f",str(ROOT/"infra/docker/demo.override.yaml"),"--profile","scheduler",*args],cwd=ROOT,env=environ,check=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action",choices=["init","build","up","migrate","seed","status","stop","reset"])
    parser.add_argument("--confirm-demo-reset",action="store_true",help="Delete only the nilart-demo project's containers and data volumes")
    args=parser.parse_args()
    if args.action=="init":
        init()
        print("Demo configuration created in .env.demo (private permissions).")
    elif args.action=="build":
        command("build","api","web")
    elif args.action=="up":
        command("up","-d","--no-build","--wait","--wait-timeout","180")
    elif args.action=="migrate":
        command("run","--rm","--no-deps","api","alembic","upgrade","head")
    elif args.action=="seed":
        command("exec","-T","api","python","-m","nilart.bootstrap.demo_seed")
    elif args.action=="status":
        command("ps")
    elif args.action=="stop":
        command("stop")
    elif args.action=="reset":
        if not args.confirm_demo_reset:
            parser.error("Reset requires --confirm-demo-reset; only nilart-demo volumes will be removed.")
        command("down","--volumes","--remove-orphans")
        print("Demo data removed. Configuration retained; initialize services, migrate and seed to recreate it.")


if __name__=="__main__":
    main()
