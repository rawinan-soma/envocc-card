import json,sys,collections
spans=[json.loads(l) for l in open(sys.argv[1])]
byid={s['spanId']:s for s in spans}
kids=collections.defaultdict(list)
for s in spans: kids[s.get('parentSpanId')].append(s)
def show(s,d):
    print('  '*d+f"{s['name']}  [{s['scope'].replace('@opentelemetry/instrumentation-','')}]")
    for c in kids[s['spanId']]: show(c,d+1)
roots=[s for s in spans if s.get('parentSpanId') not in byid]
target=[r for r in roots if r['name'].startswith(sys.argv[2])]
for r in target:
    print(f"### trace {r['traceId']}")
    show(r,0)
# Spans outside the shown traces: if propagation broke, Prisma/BullMQ spans land here as their own roots.
shown={r['traceId'] for r in target}
other=collections.Counter(r['name'] for r in roots if r['traceId'] not in shown)
print(f"### other trace roots ({sum(other.values())}):", dict(other))
