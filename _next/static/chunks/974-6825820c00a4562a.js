"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[974],{37226:function(t,r,n){n.d(r,{A_:function(){return U},H0:function(){return B},Jl:function(){return C},OS:function(){return E},Uw:function(){return N},WN:function(){return A},XJ:function(){return q},ct:function(){return T},hG:function(){return g},zD:function(){return L}});var e,u,a,c,s,p,o,i,l,f,v=n(50029),h=n(87794),d=n.n(h),m=n(21963),b=n(75316),w=n.n(b),x=n(25751),y=n.n(x),k=n(76427),Z=n.n(k),z=n(31513),g=(e=(0,v.Z)(d().mark(function t(r){var n;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.post("requests",r).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[(0,z.UB)(n),null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return e.apply(this,arguments)}),U=(u=(0,v.Z)(d().mark(function t(r){var n;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.post("request",{requestId:y()(r)?parseInt(r):r}).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[(0,z.UB)(n),null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return u.apply(this,arguments)}),q=(a=(0,v.Z)(d().mark(function t(){var r,n,e=arguments;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return r={params:{include:e.length>0&&void 0!==e[0]?e[0]:"active"}},t.prev=2,t.next=5,m.e.get("requests",r).then(function(t){return t.data});case 5:return n=t.sent,n=w()(n,["createdAt"],["desc"]),t.abrupt("return",[n.map(z.UB),null]);case 10:return t.prev=10,t.t0=t.catch(2),t.abrupt("return",(0,m.z)(t.t0));case 13:case"end":return t.stop()}},t,null,[[2,10]])})),function(){return a.apply(this,arguments)}),B=(c=(0,v.Z)(d().mark(function t(r){var n;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.get("team-integrations/".concat(r)).then(function(t){return t.data});case 3:return n=t.sent,n=w()(n,["createdAt"],["desc"]),t.abrupt("return",[n.map(z.UB),null]);case 8:return t.prev=8,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 11:case"end":return t.stop()}},t,null,[[0,8]])})),function(t){return c.apply(this,arguments)}),T=(s=(0,v.Z)(d().mark(function t(r){var n;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.get("requests/".concat(r,"/resubmit")).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[(0,z.UB)(n),null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return s.apply(this,arguments)}),E=(p=(0,v.Z)(d().mark(function t(r,n){var e;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.post("requests/".concat(r,"/restore"),{email:n}).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[(0,z.UB)(e),null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return p.apply(this,arguments)}),L=(o=(0,v.Z)(d().mark(function t(r){var n;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.post("requests-all",r).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[{count:n.count,rows:n.rows.map(z.UB)},null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return o.apply(this,arguments)}),A=(i=(0,v.Z)(d().mark(function t(r){var n,e,u,a,c,s=arguments;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return n=s.length>1&&void 0!==s[1]&&s[1],t.prev=1,a="requests",n&&(a="".concat(a,"?submit=true")),(r=Z()(r,["user","lastChanges"])).devLoginTitle=r.devLoginTitle||"",r.testLoginTitle=r.testLoginTitle||"",r.prodLoginTitle=r.prodLoginTitle||"",r.additionalRoleAttribute=r.additionalRoleAttribute||"",r.clientId=r.clientId||"",r.primaryEndUsers=null!==(e=r.primaryEndUsers)&&void 0!==e?e:[],r.primaryEndUsersOther=null!==(u=r.primaryEndUsersOther)&&void 0!==u?u:"",t.next=14,m.e.put(a,r).then(function(t){return t.data});case 14:return c=t.sent,t.abrupt("return",[(0,z.UB)(c),null]);case 18:return t.prev=18,t.t0=t.catch(1),t.abrupt("return",(0,m.z)(t.t0));case 21:case"end":return t.stop()}},t,null,[[1,18]])})),function(t){return i.apply(this,arguments)}),C=(l=(0,v.Z)(d().mark(function t(r){var n;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.delete("requests",{params:{id:r}}).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[n,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return l.apply(this,arguments)}),N=(f=(0,v.Z)(d().mark(function t(r){var n;return d().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,m.e.put("request-metadata",r).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[(0,z.UB)(n),null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,m.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return f.apply(this,arguments)})},3016:function(t,r,n){n.d(r,{Cm:function(){return T},Dc:function(){return U},Gc:function(){return H},MH:function(){return N},NU:function(){return R},Sx:function(){return G},Um:function(){return B},YY:function(){return A},ZT:function(){return J},fC:function(){return I},l8:function(){return q},rU:function(){return _},rl:function(){return D},vM:function(){return O},w2:function(){return E},yG:function(){return L},yN:function(){return M},zZ:function(){return C}});var e,u,a,c,s,p,o,i,l,f,v,h,d,m,b,w,x,y,k=n(50029),Z=n(87794),z=n.n(Z),g=n(21963),U=(e=(0,k.Z)(z().mark(function t(){var r;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("teams").then(function(t){return t.data});case 3:return r=t.sent,t.abrupt("return",[r,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(){return e.apply(this,arguments)}),q=(u=(0,k.Z)(z().mark(function t(){var r;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("allowed-teams").then(function(t){return t.data});case 3:return r=t.sent,t.abrupt("return",[r,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(){return u.apply(this,arguments)}),B=(a=(0,k.Z)(z().mark(function t(r){var n;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("allowed-teams/".concat(r)).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[n,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return a.apply(this,arguments)}),T=(c=(0,k.Z)(z().mark(function t(r){var n;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.post("teams",r).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[n,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return c.apply(this,arguments)}),E=(s=(0,k.Z)(z().mark(function t(r){var n,e,u,a;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,n=r.name,e=r.id,u={name:n},t.next=5,g.e.put("teams/".concat(e),u).then(function(t){return t.data});case 5:return a=t.sent,t.abrupt("return",[a,null]);case 9:return t.prev=9,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 12:case"end":return t.stop()}},t,null,[[0,9]])})),function(t){return s.apply(this,arguments)}),L=(p=(0,k.Z)(z().mark(function t(r){var n,e,u;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,n=r.id,e=r.members,t.next=4,g.e.post("teams/".concat(n,"/members"),e).then(function(t){return t.data});case 4:return u=t.sent,t.abrupt("return",[u,null]);case 8:return t.prev=8,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 11:case"end":return t.stop()}},t,null,[[0,8]])})),function(t){return p.apply(this,arguments)}),A=(o=(0,k.Z)(z().mark(function t(r){var n;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("teams/".concat(r,"/members")).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[n,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return o.apply(this,arguments)}),C=(i=(0,k.Z)(z().mark(function t(r,n,e){var u;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.put("teams/".concat(r,"/members/").concat(n),e).then(function(t){return t.data});case 3:return u=t.sent,t.abrupt("return",[u,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r,n){return i.apply(this,arguments)}),N=(l=(0,k.Z)(z().mark(function t(r,n){var e;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.delete("teams/".concat(n,"/members/").concat(r)).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[e,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return l.apply(this,arguments)}),_=(f=(0,k.Z)(z().mark(function t(r,n){var e;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.post("teams/".concat(n,"/invite"),r).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[e,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return f.apply(this,arguments)}),I=(v=(0,k.Z)(z().mark(function t(r){var n;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.delete("teams/".concat(r)).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[n,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return v.apply(this,arguments)}),D=(h=(0,k.Z)(z().mark(function t(r){var n;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.post("teams/".concat(r,"/service-accounts")).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[n,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return h.apply(this,arguments)}),G=(d=(0,k.Z)(z().mark(function t(r){var n;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("teams/".concat(r,"/service-accounts")).then(function(t){return t.data});case 3:return n=t.sent,t.abrupt("return",[n,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t){return d.apply(this,arguments)}),J=(m=(0,k.Z)(z().mark(function t(r,n){var e;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("teams/".concat(r,"/service-accounts/").concat(n)).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[e,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return m.apply(this,arguments)}),O=(b=(0,k.Z)(z().mark(function t(r,n){var e;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("teams/".concat(r,"/service-accounts/").concat(n,"/credentials")).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[e,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return b.apply(this,arguments)}),H=(w=(0,k.Z)(z().mark(function t(r,n){var e;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.put("teams/".concat(r,"/service-accounts/").concat(n,"/credentials")).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[e,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return w.apply(this,arguments)}),M=(x=(0,k.Z)(z().mark(function t(r,n){var e;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.delete("teams/".concat(r,"/service-accounts/").concat(n)).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[e,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return x.apply(this,arguments)}),R=(y=(0,k.Z)(z().mark(function t(r,n){var e;return z().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.prev=0,t.next=3,g.e.get("teams/".concat(r,"/service-accounts/").concat(n,"/restore")).then(function(t){return t.data});case 3:return e=t.sent,t.abrupt("return",[e,null]);case 7:return t.prev=7,t.t0=t.catch(0),t.abrupt("return",(0,g.z)(t.t0));case 10:case"end":return t.stop()}},t,null,[[0,7]])})),function(t,r){return y.apply(this,arguments)})},67888:function(t,r,n){n.d(r,{c:function(){return s}});var e=n(16835),u=n(91296),a=n.n(u),c=n(69885),s=a()(function(t,r){if(t.length<=2){r([]);return}(0,c.$J)(t).then(function(t){var n=(0,e.Z)(t,2),u=n[0];n[1]?r([{value:"error",label:"Failed to fetch users",isDisabled:!0}]):r((null==u?void 0:u.map(function(t){return{value:t.id,label:t.mail}}))||[])})},300,{trailing:!0})}}]);