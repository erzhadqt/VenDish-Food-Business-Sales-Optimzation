import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SelectDiscount({ value, options = [], onSelect }) {
  return (
    <Select onValueChange={(selectedValue) => onSelect(selectedValue)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a discount" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Discounts</SelectLabel>
          {options.map((option, index) => (
            <SelectItem key={index} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}