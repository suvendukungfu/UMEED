# UMEED — Fly.io App-Scoped Static Egress Configuration

**Region:** `bom` (Mumbai, India)  
**Target Firewall:** MongoDB Atlas Project IP Access List  
**Pricing:** $3.60 / month per IPv4 allocation (billed hourly), IPv6 included  
**Document Version:** 1.0.0  
**Date:** November 1, 2026  

---

## 1. Overview of App-Scoped Static Egress

Fly.io provides **app-scoped static egress** networking for applications deployed in specific edge regions. Unlike ephemeral egress where containers share a large, changing pool of cloud provider IPs, app-scoped egress assigns dedicated, fixed IP addresses shared across all machines belonging to the same application and region.

### Key Capabilities & Invariants
1. **Persistence Across Deployments:** The assigned IP addresses remain constant during rolling updates, machine restarts, auto-scaling events, and image upgrades.
2. **Region-Scoped:** Traffic originating from machines in Mumbai (`bom`) routes exclusively through the assigned `bom` egress gateway.
3. **Capacity:** A single app-scoped egress IP pair can support up to 64 concurrent machine instances in that region.
4. **Zero-Trust Whitelisting:** Enables strict single-IP `/32` allowlisting in MongoDB Atlas, permanently eliminating the need for `0.0.0.0/0`.

---

## 2. Allocation Command & Lifecycle

### Allocation Step
Run from your terminal:
```bash
fly ips allocate-egress --app umeed-api -r bom
```

### Inspection Step
```bash
fly ips list --app umeed-api
```

Sample output:
```text
VERSION  IP               TYPE        REGION  ALLOCATED AT
v4       137.66.42.100    app-scoped  bom     2026-11-01T05:00:00Z
v6       2a09:8280:1::... app-scoped  bom     2026-11-01T05:00:00Z
```

### Configuration Ledger
Record your allocated addresses below for operational audit:

| Address Type | Allocated IP | Subnet Mask | Atlas Comment | Assigned App |
| :--- | :--- | :--- | :--- | :--- |
| **IPv4 Egress** | `<allocated_ipv4>` | `/32` | `UMEED Fly API Mumbai Production Egress` | `umeed-api` |
| **IPv6 Egress** | `<allocated_ipv6>` | `/128` | `UMEED Fly API Mumbai IPv6 Egress` | `umeed-api` |

---

## 3. Verifying Outbound Egress from Live Containers

To verify the actual IP address seen by external services from inside the running Fly container:

```bash
fly ssh console --app umeed-api -C "curl -s https://api.ipify.org"
```

The output must match the allocated IPv4 address from `fly ips list`.

---

## 4. Cost & Billing Considerations

- **Egress Allocation:** $3.60 / month ($0.005 / hour) per IPv4 address.
- **IPv6 Allocation:** Free / included with IPv4.
- **Data Transfer:** Standard regional outbound data transfer applies between Fly.io (Mumbai) and AWS `ap-south-1` (Mumbai). Because both data centers are located in Mumbai, network latency is typically < 10 ms.

