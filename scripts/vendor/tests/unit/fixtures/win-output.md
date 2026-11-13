# Windows 11 command output samples (anonymised)

Captured 2026-11-12 on a Windows 11 PC with read-only commands, for the help desk simulator's output formats
(`js/sim/commands.js`). Real addresses, MACs, host and router names are replaced with `<PLACEHOLDERS>`.
Lines are exact apart from that, including the trailing space after `(Preferred)` and on tracert hop lines.
Where stderr and stdout interleave differently in a pipe, the order shown is the one a console shows.

## ipconfig

```

Windows IP Configuration


Ethernet adapter Ethernet:

   Media State . . . . . . . . . . . : Media disconnected
   Connection-specific DNS Suffix  . : <SUFFIX>

Wireless LAN adapter Wi-Fi:

   Connection-specific DNS Suffix  . : 
   Link-local IPv6 Address . . . . . : <IPV6>
   IPv4 Address. . . . . . . . . . . : <IP>
   Subnet Mask . . . . . . . . . . . : <MASK>
   Default Gateway . . . . . . . . . : <GATEWAY>
```

## ipconfig /all

```

Windows IP Configuration

   Host Name . . . . . . . . . . . . : <HOST>
   Primary Dns Suffix  . . . . . . . : 
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No
   WINS Proxy Enabled. . . . . . . . : No

Ethernet adapter Ethernet:

   Media State . . . . . . . . . . . : Media disconnected
   Connection-specific DNS Suffix  . : <SUFFIX>
   Description . . . . . . . . . . . : <NIC>
   Physical Address. . . . . . . . . : <MAC>
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes

Wireless LAN adapter Wi-Fi:

   Connection-specific DNS Suffix  . : 
   Description . . . . . . . . . . . : <NIC>
   Physical Address. . . . . . . . . : <MAC>
   DHCP Enabled. . . . . . . . . . . : No
   Autoconfiguration Enabled . . . . : Yes
   Link-local IPv6 Address . . . . . : <IPV6>(Preferred) 
   IPv4 Address. . . . . . . . . . . : <IP>(Preferred) 
   Subnet Mask . . . . . . . . . . . : <MASK>
   Default Gateway . . . . . . . . . : <GATEWAY>
   DNS Servers . . . . . . . . . . . : <DNS1>
                                       <DNS2>
   NetBIOS over Tcpip. . . . . . . . : Enabled
```

## ipconfig /flushdns

```

Windows IP Configuration

Successfully flushed the DNS Resolver Cache.
```

## ping (name that does not resolve)

```
Ping request could not find host nosuchhost.invalid. Please check the name and try again.
```

## ping (success, by name)

```

Pinging example.com [<IP>] with 32 bytes of data:
Reply from <IP>: bytes=32 time=14ms TTL=59
Reply from <IP>: bytes=32 time=13ms TTL=59

Ping statistics for <IP>:
    Packets: Sent = 2, Received = 2, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 13ms, Maximum = 14ms, Average = 13ms
```

## ping 127.0.0.1

```

Pinging 127.0.0.1 with 32 bytes of data:
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128

Ping statistics for 127.0.0.1:
    Packets: Sent = 2, Received = 2, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 0ms, Maximum = 0ms, Average = 0ms
```

## ping (unused address on the local subnet)

Note: Windows counts "Destination host unreachable" replies as received, and prints no round-trip section.

```

Pinging <UNUSED_IP> with 32 bytes of data:
Reply from <OWN_IP>: Destination host unreachable.
Reply from <OWN_IP>: Destination host unreachable.

Ping statistics for <UNUSED_IP>:
    Packets: Sent = 2, Received = 2, Lost = 0 (0% loss),
```

## ping (no arguments), first lines

```

Usage: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS]
            [-r count] [-s count] [[-j host-list] | [-k host-list]]
            [-w timeout] [-R] [-S srcaddr] [-c compartment] [-p]
            [-4] [-6] target_name
```

## tracert -4 -h 3 example.com

```

Tracing route to example.com [<IP>]
over a maximum of 3 hops:

  1     4 ms     1 ms     2 ms  <ROUTER_NAME> [<GATEWAY>] 
  2     9 ms     6 ms     6 ms  <ISP_HOP> [<HOP_IP>] 
  3    13 ms     9 ms     7 ms  <ISP_HOP> [<HOP_IP>] 

Trace complete.
```

## nslookup (non-existent name)

```
Server:  <ROUTER_NAME>
Address:  <DNS1>

*** <ROUTER_NAME> can't find nosuchhost.invalid: Non-existent domain
```

## nslookup (success)

```
Server:  <ROUTER_NAME>
Address:  <DNS1>

Non-authoritative answer:
Name:    example.com
Addresses:  <IPV6>
	  <IP>
```

A single address prints `Address:  <IP>` instead of `Addresses:`.

## nslookup example.com 192.0.2.1 (server does not answer)

```
DNS request timed out.
    timeout was 2 seconds.
Server:  UnKnown
Address:  192.0.2.1

DNS request timed out.
    timeout was 2 seconds.
DNS request timed out.
    timeout was 2 seconds.
*** Request to UnKnown timed-out
```

## net use (empty)

```
New connections will be remembered.

There are no entries in the list.

```

## net use Q: \\nosuchserver\x

```
System error 67 has occurred.

The network name cannot be found.

```

## net use Q: /delete (no such mapping)

```
The network connection could not be found.

More help is available by typing NET HELPMSG 2250.

```

## unknown command

```
'foo' is not recognized as an internal or external command,
operable program or batch file.
```

## hostname

```
<HOST>
```

## arp -a

```

Interface: <OWN_IP> --- 0x2
  Internet Address      Physical Address      Type
  <GATEWAY>             <mac-lowercase>     dynamic   
  <BROADCAST>           ff-ff-ff-ff-ff-ff     static    
```
