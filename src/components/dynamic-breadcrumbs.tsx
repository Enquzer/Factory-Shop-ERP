
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const routeMap: Record<string, string> = {
  "dashboard": "Dashboard",
  "hr": "HR & Incentives",
  "employees": "Employee Directory",
  "new": "Add New",
  "payroll": "Payroll",
  "training": "Training & Exams",
  "skills": "Skill Matrix",
  "leaves": "Leave Management",
  "incentives": "Incentives",
  "actions": "Reward & Discipline",
  "products": "Products",
  "orders": "Orders",
  "inventory": "Inventory",
  "marketing-orders": "Marketing Orders",
  "production-dashboard": "Production",
  "cutting": "Cutting",
  "sewing": "Sewing",
  "packing": "Packing",
  "finishing": "Finishing",
  "quality-inspection": "Quality Control",
  "sample-management": "Sample Room",
  "designer": "Designer Studio",
  "cad": "CAD Tool",
  "store": "Store Management",
  "finance": "Finance",
  "shop": "Shop Dashboard",
}

export function DynamicBreadcrumbs() {
  const pathname = usePathname()
  
  if (pathname === "/" || pathname === "/login") return null

  const pathSegments = pathname.split("/").filter((segment) => segment !== "")
  
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {pathSegments.length > 0 && <BreadcrumbSeparator />}
        
        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join("/")}`
          const isLast = index === pathSegments.length - 1
          const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
