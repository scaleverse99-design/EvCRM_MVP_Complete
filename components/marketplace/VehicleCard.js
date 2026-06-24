// components/marketplace/VehicleCard.js
"use client"
import { Tag } from "../ui"
import { C, fmt } from "../../lib/constants"

export default function VehicleCard({ product, onClick, booking }) {
  const net = product.exShowroom - product.fame2 - product.stateSubsidy
  
  return (
    <div 
      onClick={() => onClick(product.id)}
      style={{ 
        background:"#fff", 
        borderRadius:16, 
        padding:18, 
        boxShadow:"0 2px 16px rgba(0,0,0,0.06)", 
        cursor:"pointer", 
        border:`1px solid ${product.available ? C.border : C.red+"30"}`, 
        transition:"transform 0.15s, box-shadow 0.15s" 
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform="translateY(-3px)";
        e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.12)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform="none";
        e.currentTarget.style.boxShadow="0 2px 16px rgba(0,0,0,0.06)"
      }}
    >
      <div style={{ fontSize:36, textAlign:"center", marginBottom:12 }}>
        {product.type.includes("4W") ? "🚙" : "🛵"}
      </div>
      
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:C.ink }}>{product.brand} {product.model}</div>
          <div style={{ fontSize:10.5, color:C.ink3, marginTop:1 }}>{product.type}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:16, fontWeight:900, color:C.greenD }}>{fmt.currency(net)}</div>
          <div style={{ fontSize:9.5, color:C.ink3, textDecoration:"line-through" }}>{fmt.currency(product.exShowroom)}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:10, flexWrap:"wrap" }}>
        {[{l:`${product.range}km`,i:"⚡"}, {l:`${product.chargeTime}min`,i:"🔌"}, {l:`${product.topSpeed}km/h`,i:"🏎"}].map((s,i)=>(
          <span key={i} style={{ fontSize:10.5, color:C.ink3 }}>{s.i} {s.l}</span>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:11, color:C.orange }}>★ {product.rating}</span>
        <span style={{ fontSize:10.5, color:C.ink3 }}>({product.reviews})</span>
        {!product.available && <Tag label="OUT OF STOCK" color={C.red} />}
        {product.available && <Tag label={`${product.deliveryWeeks}wk delivery`} color={C.green} />}
        {product.nearbyService && <Tag label={`${product.nearbyService} service points`} color={C.blue} />}
      </div>

      {product.pros && (
        <div style={{ marginBottom: 12, padding: 10, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
           <div style={{ fontSize: 9, fontWeight: 900, color: C.green, marginBottom: 4 }}>EXPERT INSIGHT</div>
           <div style={{ fontSize: 10.5, color: C.ink2, lineHeight: 1.4 }}>
             "{product.pros[0]} ... but {product.cons[0].toLowerCase()}."
           </div>
        </div>
      )}

      <button 
        disabled={booking} 
        onClick={e => {
          e.stopPropagation();
          if (product.available) onClick(product.id, true); // true for direct booking
          else onClick(product.id);
        }} 
        style={{ 
          width:"100%", 
          background:product.available ? C.greenD : C.bg, 
          color:product.available ? "#fff" : C.ink, 
          border:product.available ? "none" : `1px solid ${C.border}`, 
          borderRadius:10, 
          padding:"11px", 
          fontSize:12, 
          fontWeight:product.available ? 800 : 600, 
          cursor:booking ? "wait" : "pointer", 
          opacity:booking ? 0.7 : 1 
        }}
      >
        {booking ? "..." : (product.available ? `Book Now — ${fmt.currency(net)}` : "Join Waitlist")}
      </button>
    </div>
  )
}
