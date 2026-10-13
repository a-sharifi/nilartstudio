from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LocalizedCopy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fa: str = Field(min_length=1, max_length=3000)
    en: str = Field(min_length=1, max_length=3000)


class ProductView(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: LocalizedCopy
    view: Literal["front", "back", "inside", "detail"]


class ProductFact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: LocalizedCopy
    value: LocalizedCopy


class ProductChoice(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str = Field(min_length=1, max_length=160)
    label: LocalizedCopy
    caption: LocalizedCopy | None = None


class ProductOptionFamily(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=160)
    label: LocalizedCopy
    choices: list[ProductChoice] = Field(min_length=1, max_length=100)
    helper: LocalizedCopy | None = None


class ProductCombination(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=160)
    selections: dict[str, str] = Field(min_length=1, max_length=20)


class ProductPresentation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intro: LocalizedCopy
    about: LocalizedCopy
    kind: Literal["book", "bookmark", "stickers"]
    color: Literal["sage", "lilac", "sand", "rose", "blue"]
    gallery: list[ProductView] = Field(min_length=1, max_length=10)
    specifications: list[ProductFact] = Field(max_length=20)
    option_labels: dict[str, LocalizedCopy] = Field(default_factory=dict, max_length=1000)
    delivery: LocalizedCopy

    option_groups: list[ProductOptionFamily] = Field(default_factory=list, max_length=20)
    option_combinations: list[ProductCombination] = Field(default_factory=list, max_length=1000)
    fixed_fact: ProductFact | None = None

    @model_validator(mode="after")
    def validate_combinations(self):
        groups = {group.id: {choice.value for choice in group.choices} for group in self.option_groups}
        if len(groups) != len(self.option_groups) or any(len(groups[group.id]) != len(group.choices) for group in self.option_groups):
            raise ValueError("Duplicate option identity")
        codes, selections = set(), set()
        for combination in self.option_combinations:
            if set(combination.selections) != set(groups) or any(value not in groups[key] for key, value in combination.selections.items()):
                raise ValueError("Incomplete or foreign selection")
            key = tuple(sorted(combination.selections.items()))
            if combination.code in codes or key in selections:
                raise ValueError("Duplicate combination")
            codes.add(combination.code)
            selections.add(key)
        if bool(self.option_groups) != bool(self.option_combinations):
            raise ValueError("Options require explicit combinations")
        return self
