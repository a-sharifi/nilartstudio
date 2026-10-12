from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Label(StrictModel):
    id: UUID
    title_fa: str = Field(min_length=1, max_length=300)
    title_en: str = Field(min_length=1, max_length=300)
    order: int = Field(ge=0, strict=True)

    @model_validator(mode="after")
    def nonblank(self):
        if not self.title_fa.strip() or not self.title_en.strip():
            raise ValueError("Both labels must be nonblank")
        return self


class Option(Label):
    values: list[Label] = Field(min_length=1, max_length=100)


class Choice(StrictModel):
    option_id: UUID
    value_id: UUID


class Combination(StrictModel):
    code: str = Field(min_length=1, max_length=160)
    selections: list[Choice] = Field(max_length=20)


class OptionDocument(StrictModel):
    options: list[Option] = Field(max_length=20)
    combinations: list[Combination] = Field(max_length=1000)

    @model_validator(mode="after")
    def valid_combinations(self):
        option_ids = [option.id for option in self.options]
        values = [value.id for option in self.options for value in option.values]
        if len(set(option_ids)) != len(option_ids) or len(set(values)) != len(values):
            raise ValueError("Duplicate option or value IDs")
        if len({option.order for option in self.options}) != len(self.options):
            raise ValueError("Duplicate option order")
        for option in self.options:
            if len({value.order for value in option.values}) != len(option.values):
                raise ValueError("Duplicate value order")
        allowed = {option.id: {value.id for value in option.values} for option in self.options}
        codes, combinations = set(), set()
        for combination in self.combinations:
            if not combination.code.strip() or combination.code != combination.code.strip() or combination.code in codes:
                raise ValueError("Invalid or duplicate combination code")
            codes.add(combination.code)
            choices = {choice.option_id: choice.value_id for choice in combination.selections}
            if len(choices) != len(combination.selections) or set(choices) != set(allowed):
                raise ValueError("Exactly one value per option required")
            if any(value not in allowed[option] for option, value in choices.items()):
                raise ValueError("Foreign option value")
            key = tuple(sorted((str(option), str(value)) for option, value in choices.items()))
            if key in combinations:
                raise ValueError("Duplicate combination")
            combinations.add(key)
        return self

    def snapshot(self):
        data = self.model_dump(mode="json")
        data["options"].sort(key=lambda option: option["order"])
        for option in data["options"]:
            option["values"].sort(key=lambda value: value["order"])
        for combination in data["combinations"]:
            combination["selections"].sort(key=lambda choice: choice["option_id"])
        return data
